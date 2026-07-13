import { JobWorker } from '@beautinique/backend-bullmq';
import { MEDIA_STATUS_MAP } from '@beautinique/shared-constants';
import { stringifyData } from '@beautinique/shared-utils';

import { logger } from '../configs/index.js';
import { CLEANUP_DELAY } from '../constants/index.js';
import { envs } from '../envs/index.js';
import { Media } from '../models/index.js';
import { cloudinary } from './Cloudinary.js';

const WORKER_CONCURRENCY = 5;

export class WorkerManager {
  private worker: JobWorker<'media-queue'> | undefined;

  /* ---------------- START ---------------- */

  public start() {
    this.worker = new JobWorker({
      queueName: 'media-queue',
      connection: envs.redis.bull_mq,
      concurrency: WORKER_CONCURRENCY,
      logger,
      handlers: {
        /* ---------------- REMOVE SINGLE MEDIA ---------------- */

        'remove-single-media-directly': async (data) => {
          try {
            await cloudinary.removeSingle(data);
          } catch (error) {
            logger.error(
              `Failed to remove single media directly. Error:${stringifyData(error)}. Data:${stringifyData(
                data,
              )}`,
            );

            throw error;
          }
        },

        /* ---------------- REMOVE MULTIPLE MEDIA ---------------- */

        'remove-multiple-media-directly': async (data) => {
          try {
            await cloudinary.removeMultiple(data);
          } catch (error) {
            logger.error(
              `Failed to remove multiple media directly. Error:${stringifyData(error)}. Data:${stringifyData(
                data,
              )}`,
            );

            throw error;
          }
        },

        /* ---------------- CREATE SINGLE UNUSED MEDIA ---------------- */

        'create-single-unused-media': async (data) => {
          try {
            const expiresAt = new Date(Date.now() + CLEANUP_DELAY);
            await Media.create({ ...data, status: MEDIA_STATUS_MAP.UNUSED, expiresAt });
          } catch (error) {
            logger.error(
              `Failed to create single unused media. Error:${stringifyData(error)}. Data:${stringifyData(data)}`,
            );

            throw error;
          }
        },

        /* ---------------- CREATE MULTIPLE UNUSED MEDIA ---------------- */

        'create-multiple-unused-media': async (data) => {
          try {
            const expiresAt = new Date(Date.now() + CLEANUP_DELAY);

            await Media.insertMany(
              data.map((media) => ({ ...media, status: MEDIA_STATUS_MAP.UNUSED, expiresAt })),
            );
          } catch (error) {
            logger.error(
              `Failed to create multiple unused media. Error:${stringifyData(error)}. Data:${stringifyData(data)}`,
            );

            throw error;
          }
        },

        /* ---------------- MARK SINGLE MEDIA AS USED ---------------- */

        'mark-single-media-as-used': async (data) => {
          try {
            const { publicId } = data;

            const result = await Media.updateOne(
              { publicId, status: MEDIA_STATUS_MAP.UNUSED },
              { $set: { status: MEDIA_STATUS_MAP.USED }, $unset: { expiresAt: 1 } },
            );

            if (result.matchedCount === 0) {
              logger.warn(`Media already used or not found, publicId: ${publicId}`);
              return;
            }
          } catch (error) {
            logger.error(
              `Failed to mark single media as used. Error:${stringifyData(error)}. Data:${stringifyData(data)}`,
            );
            throw error;
          }
        },

        /* ---------------- MARK MULTIPLE MEDIA AS USED ---------------- */

        'mark-multiple-media-as-used': async (data) => {
          try {
            const { publicIds } = data;
            const result = await Media.updateMany(
              { publicId: { $in: publicIds }, status: MEDIA_STATUS_MAP.UNUSED },
              { $set: { status: MEDIA_STATUS_MAP.USED }, $unset: { expiresAt: 1 } },
            );

            /* ---------------- PARTIAL MATCH WARNING ---------------- */

            if (result.matchedCount !== publicIds.length) {
              logger.warn(
                `Some media were already used or not found. Requested: ${String(publicIds.length)}, Matched: ${String(result.matchedCount)}, Modified: ${String(result.modifiedCount)}, IDs: ${stringifyData(publicIds)}`,
              );
            }
          } catch (error) {
            logger.warn(
              `Some media were already used or not found. Error: ${stringifyData(error)}, Data: ${stringifyData(data)}`,
            );
            throw error;
          }
        },

        /* ---------------- DELETE SINGLE MEDIA ---------------- */

        'delete-single-media': async (data) => {
          try {
            const { publicId } = data;

            /* ---------------- FIND UNUSED MEDIA ---------------- */

            const media = await Media.findOne({ publicId, status: MEDIA_STATUS_MAP.UNUSED });

            /* ---------------- SKIP IF NOT FOUND ---------------- */

            if (!media) {
              logger.warn(`Unused media not found or already processed, publicId: ${publicId}`);

              return;
            }

            /* ---------------- REMOVE FROM CLOUDINARY ---------------- */

            await cloudinary.removeSingle({ publicId });

            /* ---------------- MARK AS DELETED ---------------- */

            await Media.updateOne(
              { _id: media._id },
              {
                $set: {
                  status: MEDIA_STATUS_MAP.DELETED,
                  deletedAt: new Date(),
                  expiresAt: new Date(Date.now() + CLEANUP_DELAY),
                },
              },
            );
          } catch (error) {
            logger.error(
              `Failed to delete single media. Error:${stringifyData(error)}. Data:${stringifyData(data)}`,
            );

            throw error;
          }
        },

        /* ---------------- DELETE MULTIPLE MEDIA ---------------- */

        'delete-multiple-media': async (data) => {
          try {
            const { publicIds } = data;

            /* ---------------- FIND UNUSED MEDIAS ---------------- */

            const medias = await Media.find({
              publicId: { $in: publicIds },
              status: MEDIA_STATUS_MAP.UNUSED,
            }).lean();

            /* ---------------- SKIP IF NOTHING FOUND ---------------- */

            if (medias.length === 0) {
              logger.warn(
                `Unused medias not found or already processed, publicIds: ${stringifyData(publicIds)}`,
              );
              return;
            }

            /* ---------------- GROUP BY RESOURCE TYPE ---------------- */

            const groupedMedia = medias.reduce<Record<string, string[]>>((acc, media) => {
              (acc[media.resourceType] ??= []).push(media.publicId);

              return acc;
            }, {});

            /* ---------------- REMOVE FROM CLOUDINARY ---------------- */

            await cloudinary.removeMultiple({ publicIds: Object.values(groupedMedia).flat() });

            /* ---------------- MARK AS DELETED ---------------- */

            await Media.updateMany(
              { _id: { $in: medias.map(({ _id }) => _id) } },
              {
                $set: {
                  status: MEDIA_STATUS_MAP.DELETED,
                  deletedAt: new Date(),
                  expiresAt: new Date(Date.now() + CLEANUP_DELAY),
                },
              },
            );

            /* ---------------- PARTIAL MATCH WARNING ---------------- */

            if (medias.length !== publicIds.length) {
              logger.warn(
                `Some medias were already processed or not found. Requested: ${String(publicIds.length)}, Found: ${String(medias.length)}, Public IDs: ${stringifyData(publicIds)}`,
              );
            }
          } catch (error) {
            logger.error(
              `Failed to delete multiple media. Error: ${stringifyData(error)}. Data: ${stringifyData(data)}`,
            );

            throw error;
          }
        },
      },
    });

    logger.info('✅ Worker manager started');
  }

  /* ---------------- RUNNING STATE ---------------- */

  public isRunning() {
    return this.worker?.isRunning() ?? false;
  }

  /* ---------------- STOP ---------------- */

  public async stop() {
    await this.worker?.close();
  }
}
