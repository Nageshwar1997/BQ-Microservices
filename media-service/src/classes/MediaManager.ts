import { logger } from '@/configs';
import type {
  ICloudinaryMultiRemover,
  ICloudinaryMultiUploader,
  ICloudinarySingleRemover,
  ICloudinarySingleUploader,
} from '@/types';

import { Cloudinary } from './Cloudinary';
import { bullQueue } from './BullQueue';

const MAX_REMOVE_RETRIES = 5;

export class MediaManager extends Cloudinary {
  /* ========== FAILED REMOVAL QUEUE FUNCTION ========== */
  private async queueFailedRemovals({
    accountKey,
    failedIds,
    retryCount,
  }: {
    accountKey: ICloudinarySingleRemover['accountKey'];
    failedIds: string[];
    retryCount?: number;
  }) {
    // 🔁 Skips queue work when there is nothing left to retry
    if (failedIds.length === 0) {
      return;
    }

    // 🧵 Pushes failed cleanup ids into the queue for background retry
    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'multi-cloudinary-media-remove',
      data: {
        publicIds: failedIds,
        accountKey,
        ...(retryCount !== undefined ? { retryCount } : {}),
      },
    });
  }

  /* ========== SINGLE MEDIA CLOUDINARY REMOVER FUNCTION ========== */
  public async singleMediaRemover({ publicId, accountKey }: ICloudinarySingleRemover) {
    // 🔒 Runs the remove flow inside the shared Cloudinary operation queue
    return this.runWithCloudinary(accountKey, async (cloudinary) =>
      this.remover({ cloudinary, publicId }),
    );
  }

  /* ========== MULTIPLE MEDIA CLOUDINARY REMOVER FUNCTION ========== */
  public async multipleMediaRemover({
    accountKey,
    publicIds,
    retryCount = 0, // 🔥 !Important: Don't Remove it
  }: ICloudinaryMultiRemover) {
    // 🔒 Runs the batch remove flow inside the shared Cloudinary operation queue
    return this.runWithCloudinary(accountKey, async (cloudinary) => {
      // 🗑️ Builds remove promises for every public id in the batch
      const removeResults = await Promise.allSettled(
        publicIds.map((publicId) => this.remover({ publicId, cloudinary })),
      );

      // 🚨 Collects only the ids that failed during removal
      const failedIds = this.getFailedIds(removeResults, publicIds);

      // 🔁 Queues failed deletes again while retry limit is not reached
      if (failedIds.length > 0 && retryCount < MAX_REMOVE_RETRIES) {
        await this.queueFailedRemovals({ accountKey, failedIds, retryCount: retryCount + 1 });
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
    });
  }

  /* ========== SINGLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
  public async singleMediaUploader(props: ICloudinarySingleUploader) {
    const { file, ...rest } = props;
    // 🔒 Runs the upload flow inside the shared Cloudinary operation queue
    return this.runWithCloudinary(rest.accountKey, async (cloudinary) =>
      this.uploader({ ...rest, buffer: file.buffer, cloudinary }),
    );
  }

  /* ========== MULTIPLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
  public async multipleMediaUploader(data: ICloudinaryMultiUploader) {
    // 🧾 Tracks successful upload public ids for rollback
    const uploadedPublicIds: string[] = [];
    const { files, ...rest } = data;

    // 🔒 Runs the batch upload flow inside the shared Cloudinary operation queue
    return this.runWithCloudinary(rest.accountKey, async (cloudinary) => {
      try {
        // 📤 Uploads all selected files in parallel
        return await Promise.all(
          files.map(async ({ buffer }) => {
            const res = await this.uploader({ ...rest, cloudinary, buffer });

            // ✅ Stores successful ids to support rollback
            uploadedPublicIds.push(res.public_id);
            return res;
          }),
        );
      } catch (error) {
        // ♻️ Starts rollback when any upload in the batch fails

        // 🧹 Tries to remove media files that were already uploaded
        const deleteResults = await Promise.allSettled(
          uploadedPublicIds.map((publicId) => this.remover({ publicId, cloudinary })),
        );

        // 🚨 Keeps only the ids that also failed during rollback
        const failedIds = this.getFailedIds(deleteResults, uploadedPublicIds);

        // 🔁 Queues failed cleanup ids for retry processing
        await this.queueFailedRemovals({ accountKey: rest.accountKey, failedIds });

        throw error;
      }
    });
  }
}

export const mediaManager = new MediaManager();
