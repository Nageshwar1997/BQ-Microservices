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

  /* ========== CLOUDINARY INSTANCE GETTER FUNCTION ========== */
  private getCloudinary() {
    // ☁️ Returns the configured Cloudinary instance for the given account
    v2.config({ ...envs.cloudinary, secure: true });

    return v2;
  }

  constructor() {
    this.cloudinary = this.getCloudinary();
  }

  /* ========== FOLDER NAME GENERATOR FUNCTION ========== */
  private generateFolderName(folder?: string) {
    // 🧹 Converts unsafe folder characters into safe underscores
    const sanitize = (str: string) => str.replace(FOLDER_SANITIZE_REGEX, '_');

    // 📁 Builds a clean subfolder name with a default fallback
    const subfolder = sanitize((folder || DEFAULT_FOLDER_NAME).trim().replace(/\s+/g, '_'));

    // 🏷️ Returns the final path with the main Cloudinary folder
    return `Beautinique/Images/${subfolder}`;
  }

  /* ========== PUBLIC ID GENERATOR FUNCTION ========== */
  private generatePublicId(): string {
    // 📅 Gets current date parts to build a structured public id
    const { getDate, getFullYear, getMonth } = new Date();

    const year = getFullYear();
    const month = String(getMonth() + 1).padStart(2, '0');
    const day = String(getDate()).padStart(2, '0');

    // 🆔 Generates a unique uuid for every upload
    const uuid = randomUUID();

    // 🧱 Creates the final public id using account, entity, date, and uuid
    return `${year}/${month}/${day}/${uuid}`;
  }

  /* ========== FAILED ID EXTRACTOR FUNCTION ========== */
  private getFailedIds(results: PromiseSettledResult<unknown>[], ids: string[]) {
    // 🚨 Collects only the ids whose operation failed
    return results.reduce<string[]>((acc, result, index) => {
      if (result.status === 'rejected') {
        acc.push(ids[index]);
      }

      return acc;
    }, []);
  }

  /* ========== SINGLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
  private uploader(folder: string, buffer: Buffer<ArrayBufferLike>) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      // 🚀 Starts the stream-based upload
      const stream = this.cloudinary.uploader.upload_stream(
        {
          folder: this.generateFolderName(folder),
          public_id: this.generatePublicId(),
          resource_type: 'image',
          allowed_formats: Object.values(MIME_TO_FORMAT),
        },
        (error, result) => {
          // ❌ Rejects with a standardized app error if upload fails
          if (error || !result) {
            return reject(
              new AppError({
                message: error?.message || `Failed to upload image`,
                statusCode: 400,
                code: 'UPLOAD_ERROR',
              }),
            );
          }

          // ✅ Resolves the successful Cloudinary response
          resolve(result);
        },
      );

      // 📦 Pushes the incoming file buffer into the stream
      stream.end(buffer);
    });
  }

  private remover(publicId: string) {
    return new Promise<DeleteApiResponse>((resolve, reject) => {
      // 🗑️ Deletes the given public id from Cloudinary storage
      this.cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
        if (error) {
          logger.error('Failed to remove image from Cloudinary', error);
          return reject(
            new AppError({
              message: error.message || 'Failed to remove image from Cloudinary',
              statusCode: 400,
              code: 'INTERNAL_ERROR',
            }),
          );
        }

        logger.info('Image removed from Cloudinary', result);

        // ✅ Resolves the delete response after successful removal
        resolve(result);
      });
    });
  }

  /* ========== FAILED REMOVAL QUEUE FUNCTION ========== */
  private async queueFailedRemovals(failedIds: string[], retryCount?: number) {
    // 🔁 Skips queue work when there is nothing left to retry
    if (failedIds.length === 0) {
      return;
    }

    // 🧵 Pushes failed cleanup ids into the queue for background retry
    await bullQueue.addJob({
      queueName: 'cloudinary-image-queue',
      jobName: 'multiple-image-remover',
      data: { publicIds: failedIds, ...(retryCount !== undefined && { retryCount }) },
    });
  }

  /* ========== SINGLE MEDIA CLOUDINARY REMOVER FUNCTION ========== */
  public async removeSingle(publicId: string) {
    // 🔒 Runs the remove flow inside the shared Cloudinary operation queue
    return this.remover(publicId);
  }

  /* ========== MULTIPLE MEDIA CLOUDINARY REMOVER FUNCTION ========== */
  public async removeMultiple(
    publicIds: string[],
    retryCount = 0, // 🔥 !Important: Don't Remove it
  ) {
    // 🔒 Runs the batch remove flow inside the shared Cloudinary operation queue
    // 🗑️ Builds remove promises for every public id in the batch
    const removeResults = await Promise.allSettled(
      publicIds.map((publicId) => this.remover(publicId)),
    );

    // 🚨 Collects only the ids that failed during removal
    const failedIds = this.getFailedIds(removeResults, publicIds);

    const MAX_REMOVE_RETRIES = 5;

    // 🔁 Queues failed deletes again while retry limit is not reached
    if (failedIds.length > 0 && retryCount < MAX_REMOVE_RETRIES) {
      await this.queueFailedRemovals(failedIds, retryCount + 1);
    }

    // 🚫 Logs the final failed ids when max retries are exhausted
    if (failedIds.length > 0 && retryCount >= MAX_REMOVE_RETRIES) {
      logger.error('Max retries reached for IDs:', failedIds);
    }

    // 📦 Returns a summary of the batch remove operation
    return {
      success: failedIds.length === 0,
      partialFailure: failedIds.length > 0,
      failedIds,
      retryCount,
    };
  }

  /* ========== SINGLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
  public async uploadSingle(folder: string, file: Express.Multer.File) {
    // 🔒 Runs the upload flow inside the shared Cloudinary operation queue
    return this.uploader(folder, file.buffer);
  }

  /* ========== MULTIPLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
  public async uploadMultiple(folder: string, files: Express.Multer.File[]) {
    // 🧾 Tracks successful upload public ids for rollback
    const uploadedPublicIds: string[] = [];

    try {
      return await Promise.all(
        files.map(async ({ buffer }) => {
          // 📤 Uploads all selected files in parallel
          const res = await this.uploader(folder, buffer);

          // ✅ Stores successful ids to support rollback
          uploadedPublicIds.push(res.public_id);
          return res;
        }),
      );
    } catch (error) {
      // ♻️ Starts rollback when any upload in the batch fails

      // 🧹 Tries to remove media files that were already uploaded
      const deleteResults = await Promise.allSettled(
        uploadedPublicIds.map((publicId) => this.remover(publicId)),
      );

      // 🚨 Keeps only the ids that also failed during rollback
      const failedIds = this.getFailedIds(deleteResults, uploadedPublicIds);

      // 🔁 Queues failed cleanup ids for retry processing
      await this.queueFailedRemovals(failedIds);

      throw error;
    }
  }
}

export const cloudinary = new Cloudinary();
