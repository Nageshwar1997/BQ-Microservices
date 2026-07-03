import { ExternalServiceError } from '@beautinique/backend-classes';
import { bullQueue } from '@beautinique/be-jobs';
import type { TMediaUpload } from '@beautinique/be-zod';
import {
  IMAGE_FORMATS,
  IMAGE_MIMES,
  MEDIA_RESOURCE_MAP,
  VIDEO_FORMATS,
  VIDEO_MIMES,
} from '@beautinique/shared-constants';
import type {
  TImageFormat,
  TImageMime,
  TMediaResource,
  TVideoFormat,
  TVideoMime,
} from '@beautinique/shared-types';
import { type DeleteApiResponse, type UploadApiResponse, v2 } from 'cloudinary';
import { createHash, randomUUID } from 'crypto';
import pLimit from 'p-limit';

import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import type {
  IMedia,
  IMultipleRemover,
  IMultipleUploader,
  IRemover,
  ISingleRemover,
  ISingleUploader,
  IUploader,
} from '../types/index.js';

const DEFAULT_FOLDER_NAME = 'common_folder';
const FOLDER_SANITIZE_REGEX = /[&|/\\#?%]/g;
const MAX_REMOVE_RETRIES = 5;
const REMOVE_CONCURRENCY = 5;

class Cloudinary {
  private cloudinary: typeof v2;

  /* ---------------- INITIALIZE ---------------- */

  private getCloudinary() {
    v2.config({ ...envs.cloudinary, secure: true });

    return v2;
  }

  constructor() {
    this.cloudinary = this.getCloudinary();
  }

  private getResourceTypeFromPublicId(publicId: string): TMediaResource {
    if (publicId.includes('Beautinique/Images/')) {
      return MEDIA_RESOURCE_MAP.IMAGE;
    }

    if (publicId.includes('Beautinique/Videos/')) {
      return MEDIA_RESOURCE_MAP.VIDEO;
    }

    return MEDIA_RESOURCE_MAP.IMAGE;
  }

  /* ========== GENERATE SAFE FOLDER PATH ========== */
  private generateFolderName({
    folder,
    resourceType,
  }: TMediaUpload & Pick<IMedia, 'resourceType'>) {
    // Replace unsafe characters with underscore
    const sanitize = (str: string) => str.replace(FOLDER_SANITIZE_REGEX, '_');
    const mediaType = resourceType === MEDIA_RESOURCE_MAP.IMAGE ? 'Images' : 'Videos';
    // Normalize folder name (trim + replace spaces)
    const subfolder = sanitize((folder || DEFAULT_FOLDER_NAME).trim().replace(/\s+/g, '_'));

    // Final Cloudinary folder path
    return `Beautinique/${mediaType}/${subfolder}`;
  }

  /* ========== GENERATE UNIQUE PUBLIC ID ========== */
  private generatePublicId() {
    // Extract current date parts
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${String(year)}/${month}/${day}/${randomUUID()}`;
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
  private async queueFailedRemovals(failedIds: string[], retryCount = 0) {
    // Skip if nothing to retry
    if (failedIds.length === 0) return;

    const batchId = createHash('md5').update(failedIds.sort().join('-')).digest('hex').slice(0, 12);

    // Push failed deletions into background job queue+
    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'remove-multiple-media-directly',
      data: { publicIds: failedIds, retryCount },
      options: { jobId: `remove-multiple-directly-${batchId}` },
    });
  }

  private getResourceType(file: Express.Multer.File): TMediaResource {
    const mimeType = file.mimetype.toLowerCase();

    // const imgMimes = IMAGE_MIMES as unknown as string[];

    if (IMAGE_MIMES.includes(mimeType as TImageMime)) {
      return MEDIA_RESOURCE_MAP.IMAGE;
    }

    if (VIDEO_MIMES.includes(mimeType as TVideoMime)) {
      return MEDIA_RESOURCE_MAP.VIDEO;
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (extension) {
      if (IMAGE_FORMATS.includes(extension as TImageFormat)) {
        return MEDIA_RESOURCE_MAP.IMAGE;
      }

      if (VIDEO_FORMATS.includes(extension as TVideoFormat)) {
        return MEDIA_RESOURCE_MAP.VIDEO;
      }
    }

    return MEDIA_RESOURCE_MAP.IMAGE;
  }

  /* ========== INTERNAL UPLOAD HANDLER (STREAM) ========== */
  private uploader({ file, folder }: IUploader) {
    const resourceType = this.getResourceType(file);
    const allowed_formats =
      resourceType === MEDIA_RESOURCE_MAP.IMAGE ? IMAGE_FORMATS : VIDEO_FORMATS;
    return new Promise<UploadApiResponse>((resolve, reject) => {
      // Upload using stream (efficient for large files like images or videos)
      const stream = this.cloudinary.uploader.upload_stream(
        {
          folder: this.generateFolderName({ folder, resourceType }),
          public_id: this.generatePublicId(),
          resource_type: resourceType,
          allowed_formats: [...allowed_formats],
          ...(resourceType === MEDIA_RESOURCE_MAP.VIDEO && {
            chunk_size: 5000000, // Upload in chunks (~5MB)
          }),
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new ExternalServiceError(error?.message ?? 'Failed to upload media', {
                cause: error,
              }),
            );
            return;
          }

          // Successfully uploaded
          let optimizedUrl = result.secure_url;

          // IMAGE → f_auto,q_auto
          if (result.resource_type === MEDIA_RESOURCE_MAP.IMAGE) {
            optimizedUrl = result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
          }

          // VIDEO → use playback_url
          else if (result.resource_type === MEDIA_RESOURCE_MAP.VIDEO) {
            optimizedUrl = (result.playback_url ??
              result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/')) as string;
          }

          resolve({ ...result, secure_url: optimizedUrl });
        },
      );

      // Send buffer to stream
      stream.end(file.buffer);
    });
  }

  /* ========== INTERNAL DELETE HANDLER ========== */
  private async remover({ publicId }: IRemover): Promise<DeleteApiResponse> {
    const resource_type = this.getResourceTypeFromPublicId(publicId);

    try {
      const result = (await this.cloudinary.uploader.destroy(publicId, {
        resource_type,
        invalidate: true,
      })) as { result: string } & DeleteApiResponse;

      if (result.result !== 'ok' && result.result !== 'not found') {
        throw new ExternalServiceError(
          result.message || `Unexpected Cloudinary response: ${result.result}.`,
        );
      }

      logger.info('Cloudinary delete success', result);

      return result;
    } catch (error) {
      logger.error('Cloudinary delete failed', error);

      throw new ExternalServiceError(
        error instanceof Error ? error.message : 'Failed to delete media.',
        {
          cause: error,
        },
      );
    }
  }

  /* ========== REMOVE SINGLE WITH RETRY ========== */
  public async removeSingle({ retryCount = 0, ...data }: ISingleRemover & { retryCount?: number }) {
    try {
      return await this.remover(data);
    } catch (error) {
      if (retryCount < MAX_REMOVE_RETRIES) {
        await this.queueFailedRemovals([data.publicId], retryCount + 1);
      }

      throw error;
    }
  }

  /* ========== REMOVE MULTIPLE WITH RETRY ========== */

  public async removeMultiple({
    publicIds,
    retryCount = 0, // ⚠️ Required for retry tracking
  }: IMultipleRemover) {
    const limit = pLimit(REMOVE_CONCURRENCY);

    // Execute all deletions in parallel
    const removeResults = await Promise.allSettled(
      publicIds.map((publicId) => limit(() => this.remover({ publicId }))),
    );

    // Extract failed IDs
    const failedIds = this.getFailedIds(removeResults, publicIds);

    if (failedIds.length > 0 && retryCount < MAX_REMOVE_RETRIES) {
      await this.queueFailedRemovals(failedIds, retryCount + 1);
    }

    // Log if retry limit exceeded
    if (failedIds.length > 0 && retryCount >= MAX_REMOVE_RETRIES) {
      logger.error('Delete retry limit reached', { failedIds, retryCount });
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
    return this.uploader(data);
  }

  /* ========== UPLOAD MULTIPLE FILES WITH ROLLBACK ========== */
  public async uploadMultiple(data: IMultipleUploader) {
    const { files, folder } = data;

    // Upload all files in parallel
    const uploadResults = await Promise.allSettled(
      files.map((file) => this.uploader({ folder, file })),
    );

    const successfulUploads = uploadResults
      .filter(
        (result): result is PromiseFulfilledResult<UploadApiResponse> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value);

    // If any upload fails → rollback previously uploaded files
    const failedUploads = uploadResults.filter((result) => result.status === 'rejected');

    if (failedUploads.length > 0) {
      const uploadedPublicIds = successfulUploads.map(({ public_id }) => public_id);

      const deleteResults = await Promise.allSettled(
        uploadedPublicIds.map((publicId) => this.remover({ publicId })),
      );

      const failedIds = this.getFailedIds(deleteResults, uploadedPublicIds);

      // Retry failed cleanup via queue
      await this.queueFailedRemovals(failedIds);

      throw new ExternalServiceError(
        'One or more uploads failed. Successfully uploaded files were rolled back.',
      );
    }

    return successfulUploads;
  }
}

export const cloudinary = new Cloudinary();
