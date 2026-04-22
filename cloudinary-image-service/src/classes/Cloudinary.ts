import { logger } from '@/configs';
import { MIME_TO_FORMAT } from '@/constants';
import { envs } from '@/envs';
import { AppError } from '@beautinique/be-classes';
import { type DeleteApiResponse, type UploadApiResponse, v2 } from 'cloudinary';
import { randomUUID } from 'crypto';
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
  private generateFolderName(folder?: string) {
    // Replace unsafe characters with underscore
    const sanitize = (str: string) => str.replace(FOLDER_SANITIZE_REGEX, '_');

    // Normalize folder name (trim + replace spaces)
    const subfolder = sanitize((folder || DEFAULT_FOLDER_NAME).trim().replace(/\s+/g, '_'));

    // Final Cloudinary folder path
    return `Beautinique/Images/${subfolder}`;
  }

  /* ========== GENERATE UNIQUE PUBLIC ID ========== */
  private generatePublicId(): string {
    // Extract current date parts
    const { getDate, getFullYear, getMonth } = new Date();

    const year = getFullYear();
    const month = String(getMonth() + 1).padStart(2, '0');
    const day = String(getDate()).padStart(2, '0');

    // Generate unique identifier
    const uuid = randomUUID();

    // Structured public_id (useful for organization & debugging)
    return `${year}/${month}/${day}/${uuid}`;
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

  /* ========== INTERNAL UPLOAD HANDLER (STREAM) ========== */
  private uploader(folder: string, buffer: Buffer<ArrayBufferLike>) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      // Upload using stream (efficient for large files like images)
      const stream = this.cloudinary.uploader.upload_stream(
        {
          folder: this.generateFolderName(folder),
          public_id: this.generatePublicId(),
          resource_type: 'image',
          allowed_formats: Object.values(MIME_TO_FORMAT),
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
          resolve(result);
        },
      );

      // Send buffer to stream
      stream.end(buffer);
    });
  }

  /* ========== INTERNAL DELETE HANDLER ========== */
  private remover(publicId: string) {
    return new Promise<DeleteApiResponse>((resolve, reject) => {
      // Delete asset from Cloudinary
      this.cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
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
      });
    });
  }

  /* ========== RETRY FAILED DELETIONS VIA QUEUE ========== */
  private async queueFailedRemovals(failedIds: string[], retryCount?: number) {
    // Skip if nothing to retry
    if (failedIds.length === 0) return;

    // Push failed deletions into background job queue
    await bullQueue.addJob({
      queueName: 'cloudinary-image-queue',
      jobName: 'multiple-image-remove',
      data: { publicIds: failedIds, ...(retryCount !== undefined && { retryCount }) },
    });
  }

  /* ========== REMOVE SINGLE FILE ========== */
  public async removeSingle(publicId: string) {
    return this.remover(publicId);
  }

  /* ========== REMOVE MULTIPLE FILES WITH RETRY LOGIC ========== */
  public async removeMultiple(
    publicIds: string[],
    retryCount = 0, // ⚠️ Required for retry tracking
  ) {
    // Execute all deletions in parallel
    const removeResults = await Promise.allSettled(publicIds.map((id) => this.remover(id)));

    // Extract failed IDs
    const failedIds = this.getFailedIds(removeResults, publicIds);

    const MAX_REMOVE_RETRIES = 5;

    // Retry failed deletions via queue
    if (failedIds.length > 0 && retryCount < MAX_REMOVE_RETRIES) {
      await this.queueFailedRemovals(failedIds, retryCount + 1);
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
  public async uploadSingle(folder: string, file: Express.Multer.File) {
    return this.uploader(folder, file.buffer);
  }

  /* ========== UPLOAD MULTIPLE FILES WITH ROLLBACK ========== */
  public async uploadMultiple(folder: string, files: Express.Multer.File[]) {
    const uploadedPublicIds: string[] = [];

    try {
      // Upload all files in parallel
      return await Promise.all(
        files.map(async ({ buffer }) => {
          const res = await this.uploader(folder, buffer);

          // Track uploaded files for rollback safety
          uploadedPublicIds.push(res.public_id);
          return res;
        }),
      );
    } catch (error) {
      // If any upload fails → rollback previously uploaded files

      const deleteResults = await Promise.allSettled(
        uploadedPublicIds.map((id) => this.remover(id)),
      );

      const failedIds = this.getFailedIds(deleteResults, uploadedPublicIds);

      // Retry failed cleanup via queue
      await this.queueFailedRemovals(failedIds);

      throw error;
    }
  }
}

export const cloudinary = new Cloudinary();
