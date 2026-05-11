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

    /* ---------------- DELETE SINGLE MEDIA ---------------- */

    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'delete-single-media',
      options: { concurrency: 5 },
      handler: async (job) => {
        try {
          const { publicId } = job.data;

          /* ---------------- FIND UNUSED MEDIA ---------------- */

          const media = await Media.findOne({ publicId, status: MEDIA_STATUS_MAP.UNUSED });

          /* ---------------- SKIP IF NOT FOUND ---------------- */

          if (!media) {
            logger.warn(`Unused media not found or already processed, publicId: ${publicId}`);

            return;
          }

          /* ---------------- REMOVE FROM CLOUDINARY ---------------- */

          await cloudinary.removeSingle({ publicId, resourceType: media.resourceType });

          /* ---------------- MARK AS DELETED ---------------- */

          await Media.updateOne(
            { _id: media._id },
            {
              $set: {
                status: MEDIA_STATUS_MAP.DELETED,
                deletedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            },
          );
        } catch (error) {
          logger.error('Failed to delete single media', { error, data: job.data });

          throw error;
        }
      },
    });

    /* ---------------- DELETE MULTIPLE MEDIA ---------------- */

    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'delete-multiple-media',
      options: { concurrency: 3 },
      handler: async (job) => {
        try {
          const { publicIds } = job.data;

          /* ---------------- FIND UNUSED MEDIAS ---------------- */

          const medias = await Media.find({
            publicId: { $in: publicIds },
            status: MEDIA_STATUS_MAP.UNUSED,
          }).lean();

          /* ---------------- SKIP IF NOTHING FOUND ---------------- */

          if (medias.length === 0) {
            logger.warn('Unused medias not found or already processed', { publicIds });
            return;
          }

          /* ---------------- GROUP BY RESOURCE TYPE ---------------- */

          const groupedMedia = medias.reduce<Record<string, string[]>>((acc, media) => {
            if (!acc[media.resourceType]) {
              acc[media.resourceType] = [];
            }

            acc[media.resourceType].push(media.publicId);

            return acc;
          }, {});

          /* ---------------- REMOVE FROM CLOUDINARY ---------------- */

          await Promise.all(
            Object.entries(groupedMedia).map(async ([resourceType, publicIds]) => {
              await cloudinary.removeMultiple({
                publicIds,
                resourceType: resourceType as (typeof medias)[number]['resourceType'],
              });
            }),
          );

          /* ---------------- MARK AS DELETED ---------------- */

          await Media.updateMany(
            { _id: { $in: medias.map(({ _id }) => _id) } },
            {
              $set: {
                status: MEDIA_STATUS_MAP.DELETED,
                deletedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            },
          );

          /* ---------------- PARTIAL MATCH WARNING ---------------- */

          if (medias.length !== publicIds.length) {
            logger.warn('Some medias were already processed or not found', {
              requestedCount: publicIds.length,
              foundCount: medias.length,
              publicIds,
            });
          }
        } catch (error) {
          logger.error('Failed to delete multiple media', { error, data: job.data });

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
