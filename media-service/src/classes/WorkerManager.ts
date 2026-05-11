import { bullWorker } from '@beautinique/be-jobs';

import { MEDIA_STATUS_MAP } from '@beautinique/be-constants';
import { logger } from '../configs';
import { envs } from '../envs';
import { Media } from '../models';
import { cloudinary } from './Cloudinary';

class WorkerManager {
  /* ---------------- CONNECT ---------------- */

  private connect() {
    try {
      bullWorker.connect(envs.redis.queue);

      logger.info('Bull workers connected successfully');
    } catch (error) {
      logger.error('Failed to connect bull workers', error);

      throw error;
    }
  }

  /* ---------------- RUN WORKERS ---------------- */

  private runWorkers() {
    /* ---------------- REMOVE SINGLE MEDIA ---------------- */

    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'remove-single-media-directly',
      options: { concurrency: 5 },
      handler: async (job) => {
        try {
          await cloudinary.removeSingle(job.data);
        } catch (error) {
          logger.error('Failed to remove single media directly', {
            error,
            data: job.data,
          });

          throw error;
        }
      },
    });

    /* ---------------- REMOVE MULTIPLE MEDIA ---------------- */

    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'remove-multiple-media-directly',
      options: { concurrency: 3 },
      handler: async (job) => {
        try {
          await cloudinary.removeMultiple(job.data);
        } catch (error) {
          logger.error('Failed to remove multiple media directly', {
            error,
            data: job.data,
          });

          throw error;
        }
      },
    });

    /* ---------------- MARK SINGLE MEDIA AS USED ---------------- */

    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'mark-single-media-as-used',
      options: { concurrency: 5 },
      handler: async (job) => {
        try {
          const { publicId } = job.data;

          const result = await Media.updateOne(
            { publicId, status: MEDIA_STATUS_MAP.UNUSED },
            { $set: { status: MEDIA_STATUS_MAP.USED }, $unset: { expiresAt: 1 } },
          );

          if (result.matchedCount === 0) {
            logger.warn(`Media already used or not found, publicId: ${publicId}`);
            return;
          }
        } catch (error) {
          logger.error('Failed to mark single media as used', { error, data: job.data });
          throw error;
        }
      },
    });

    /* ---------------- MARK MULTIPLE MEDIA AS USED ---------------- */

    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'mark-multiple-media-as-used',
      options: { concurrency: 3 },
      handler: async (job) => {
        try {
          const { publicIds } = job.data;
          const result = await Media.updateMany(
            { publicId: { $in: publicIds }, status: MEDIA_STATUS_MAP.UNUSED },
            { $set: { status: MEDIA_STATUS_MAP.USED }, $unset: { expiresAt: 1 } },
          );

          /* ---------------- PARTIAL MATCH WARNING ---------------- */

          if (result.matchedCount !== publicIds.length) {
            logger.warn('Some media were already used or not found', {
              requestedCount: publicIds.length,
              matchedCount: result.matchedCount,
              modifiedCount: result.modifiedCount,
              publicIds,
            });
          }
        } catch (error) {
          logger.error('Failed to mark multiple media as used', { error, data: job.data });
          throw error;
        }
      },
    });
  }

  /* ---------------- START ---------------- */

  public start() {
    this.connect();

    this.runWorkers();

    logger.info('Worker manager started');
  }

  /* ---------------- STOP ---------------- */

  public async stop() {
    logger.info('Closing workers...');

    await bullWorker.closeAll();

    logger.info('All workers closed');
  }
}

export const workerManager = new WorkerManager();
