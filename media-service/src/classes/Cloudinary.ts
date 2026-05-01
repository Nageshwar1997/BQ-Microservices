import { AppError } from '@beautinique/be-classes';
import { FILE_MIME } from '@beautinique/be-constants';
import { type DeleteApiResponse, type UploadApiResponse, v2 } from 'cloudinary';
import { randomUUID } from 'crypto';
import { logger } from '../configs';
import { MIME_TO_FORMAT } from '../constants';
import { envs } from '../envs';
import type {
  IMultipleRemover,
  IMultipleUploader,
  IRemover,
  ISingleRemover,
  ISingleUploader,
  IUploader,
  IUploaderBase,
  TResourceType,
} from '../types';
import { bullQueue } from './BullQueue';

const DEFAULT_FOLDER_NAME = 'common_folder';
const FOLDER_SANITIZE_REGEX = /[&|/\\#?%]/g;

class Cloudinary {
  private cloudinary: typeof v2;

  /* ========== INITIALIZE CLOUDINARY INSTANCE ========== */
  private getCloudinary() {
    // Configure Cloudinary SDK using environment variables
    v2.config({ ...envs.cloudinary, secure: true });
    return v2;
  }

  constructor() {
    this.cloudinary = this.getCloudinary();
  }

  /* ========== GENERATE SAFE FOLDER PATH ========== */
  private generateFolderName({ folder, resourceType }: IUploaderBase) {
    // Replace unsafe characters with underscore
    const sanitize = (str: string) => str.replace(FOLDER_SANITIZE_REGEX, '_');
    const type = resourceType === 'image' ? 'Images' : 'Videos';
    // Normalize folder name (trim + replace spaces)
    const subfolder = sanitize((folder || DEFAULT_FOLDER_NAME).trim().replace(/\s+/g, '_'));

    // Final Cloudinary folder path
    return `Beautinique/${type}/${subfolder}`;
  }

  /* ========== GENERATE UNIQUE PUBLIC ID ========== */
  private generatePublicId(): string {
    // Extract current date parts
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Generate unique identifier
    const uuid = randomUUID();

    // Structured public_id (useful for organization & debugging)
    return `${year}/${month}/${day}/${uuid}`;
  }

  /* ========== ALLOWED FORMAT RESOLVER FUNCTION ========== */
  private getAllowedFormats(resourceType: TResourceType) {
    // 🎞️ Chooses the mime collection based on the requested resource type
    const baseMimes =
      resourceType === 'image' ? FILE_MIME.IMAGE : resourceType === 'video' ? FILE_MIME.VIDEO : [];

    // 🧾 Maps mime types into Cloudinary-supported formats
    const allowedFormats = baseMimes
      .map((mime) => MIME_TO_FORMAT[resourceType][mime])
      .filter((format): format is string => Boolean(format));

    if (!allowedFormats.length) {
      throw new AppError({
        message: `Unsupported mime: ${baseMimes.join(', ')}`,
        statusCode: 400,
        code: 'UPLOAD_ERROR',
      });
    }

    return allowedFormats;
  }

  /* ========== EXTRACT FAILED IDS FROM RESULTS ========== */
  private getFailedIds(results: PromiseSettledResult<unknown>[], ids: string[]) {
    // Return only IDs whose corresponding promise failed
    return results.reduce<string[]>((acc, result, index) => {
      if (result.status === 'rejected') {
        acc.push(ids[index]);
      }
      return acc;
    }, []);
  }

  /* ========== RETRY FAILED DELETIONS VIA QUEUE ========== */
  private async queueFailedRemovals(
    failedIds: string[],
    resourceType: TResourceType,
    retryCount?: number,
  ) {
    // Skip if nothing to retry
    if (failedIds.length === 0 && !resourceType) return;

    // Push failed deletions into background job queue
    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'multiple-media-remove',
      data: { resourceType, publicIds: failedIds, ...(retryCount !== undefined && { retryCount }) },
    });
  }

  /* ========== INTERNAL UPLOAD HANDLER (STREAM) ========== */
  private uploader({ buffer, folder, resourceType }: IUploader) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      // Upload using stream (efficient for large files like images or videos)
      const stream = this.cloudinary.uploader.upload_stream(
        {
          folder: this.generateFolderName({ folder, resourceType }),
          public_id: this.generatePublicId(),
          resource_type: resourceType,
          allowed_formats: this.getAllowedFormats(resourceType),
          ...(resourceType === 'video' && {
            chunk_size: 5000000, // Upload in chunks (~5MB)
          }),
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new AppError({
                message: error?.message || `Failed to upload media`,
                statusCode: 400,
                code: 'UPLOAD_ERROR',
              }),
            );
          }

          // Successfully uploaded
          let optimizedUrl = result.secure_url;

          // IMAGE → f_auto,q_auto
          if (result.resource_type === 'image') {
            optimizedUrl = result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
          }

          // VIDEO → use playback_url
          if (result.resource_type === 'video') {
            if (result.playback_url) {
              optimizedUrl = result.playback_url;
            } else {
              optimizedUrl = result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
            }
          }

          resolve({ ...result, secure_url: optimizedUrl });
        },
      );

      // Send buffer to stream
      stream.end(buffer);
    });
  }

  /* ========== INTERNAL DELETE HANDLER ========== */
  private remover({ publicId, resourceType }: IRemover) {
    return new Promise<DeleteApiResponse>((resolve, reject) => {
      // Delete asset from Cloudinary
      this.cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary delete failed', error);

            return reject(
              new AppError({
                message: error.message || 'Failed to delete media',
                statusCode: 400,
                code: 'INTERNAL_ERROR',
              }),
            );
          }

          logger.info('Cloudinary delete success', result);
          resolve(result);
        },
      );
    });
  }

  /* ========== REMOVE SINGLE FILE ========== */
  public async removeSingle(data: ISingleRemover) {
    return this.remover(data);
  }

  /* ========== REMOVE MULTIPLE FILES WITH RETRY LOGIC ========== */
  public async removeMultiple({
    publicIds,
    resourceType,
    retryCount = 0, // ⚠️ Required for retry tracking}
  }: IMultipleRemover) {
    // Execute all deletions in parallel
    const removeResults = await Promise.allSettled(
      publicIds.map((publicId) => this.remover({ publicId, resourceType })),
    );

    // Extract failed IDs
    const failedIds = this.getFailedIds(removeResults, publicIds);

    const MAX_REMOVE_RETRIES = 5;

    // Retry failed deletions via queue
    if (failedIds.length > 0 && retryCount < MAX_REMOVE_RETRIES) {
      await this.queueFailedRemovals(failedIds, resourceType, retryCount + 1);
    }

    // Log if retry limit exceeded
    if (failedIds.length > 0 && retryCount >= MAX_REMOVE_RETRIES) {
      logger.error('Delete retry limit reached', failedIds);
    }

    return {
      success: failedIds.length === 0,
      partialFailure: failedIds.length > 0,
      failedIds,
      retryCount,
    };
  }

  /* ========== UPLOAD SINGLE FILE ========== */
  public async uploadSingle(data: ISingleUploader) {
    const { file, ...rest } = data;
    return this.uploader({ ...rest, buffer: file.buffer });
  }

  /* ========== UPLOAD MULTIPLE FILES WITH ROLLBACK ========== */
  public async uploadMultiple(data: IMultipleUploader) {
    const uploadedPublicIds: string[] = [];
    const { files, folder, resourceType } = data;

    try {
      // Upload all files in parallel
      return await Promise.all(
        files.map(async ({ buffer }) => {
          const res = await this.uploader({ folder, resourceType, buffer });

          // Track uploaded files for rollback safety
          uploadedPublicIds.push(res.public_id);
          return res;
        }),
      );
    } catch (error) {
      // If any upload fails → rollback previously uploaded files

      const deleteResults = await Promise.allSettled(
        uploadedPublicIds.map((publicId) => this.remover({ publicId, resourceType })),
      );

      const failedIds = this.getFailedIds(deleteResults, uploadedPublicIds);

      // Retry failed cleanup via queue
      await this.queueFailedRemovals(failedIds, resourceType);

      throw error;
    }
  }
}

export const cloudinary = new Cloudinary();
