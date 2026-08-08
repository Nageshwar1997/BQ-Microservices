import { JobWorker } from '@beautinique/backend-bullmq';
import { MEDIA_STATUS_MAP } from '@beautinique/backend-constants';

import { getObjId } from '@beautinique/backend-mongoose';
import { logger } from '../configs/index.js';
import { CLEANUP_DELAY } from '../constants/index.js';
import { envs } from '../envs/index.js';
import { Media } from '../models/index.js';
import type { TResource } from '../types/index.js';
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
            logger.error({ Error: error, Data: data }, 'Failed to remove single media directly.');

            throw error;
          }
        },

        /* ---------------- REMOVE MULTIPLE MEDIA ---------------- */

        'remove-multiple-media-directly': async (data) => {
          try {
            await cloudinary.removeMultiple(data);
          } catch (error) {
            logger.error({ Error: error, Data: data }, 'Failed to remove multiple media directly.');

            throw error;
          }
        },

        /* ---------------- CREATE SINGLE UNUSED MEDIA ---------------- */

        'create-single-unused-media': async (data) => {
          try {
            const expiresAt = new Date(Date.now() + CLEANUP_DELAY);
            const userId = getObjId(data.userId);
            const resourceType = data.resourceType as TResource['resourceType'];
            await Media.create({
              ...data,
              userId,
              resourceType,
              status: MEDIA_STATUS_MAP.UNUSED,
              expiresAt,
            });
          } catch (error) {
            logger.error({ Error: error, Data: data }, 'Failed to create single unused media.');

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
            logger.error({ Error: error, Data: data }, 'Failed to create multiple unused media.');

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
            logger.error({ Error: error, Data: data }, 'Failed to mark single media as used.');
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
                {
                  Requested: publicIds.length,
                  Matched: result.matchedCount,
                  Modified: result.modifiedCount,
                  IDs: publicIds,
                },
                'Some media were already used or not found.',
              );
            }
          } catch (error) {
            logger.warn({ Error: error, Data: data }, 'Some media were already used or not found.');
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
            logger.error({ Error: error, Data: data }, 'Failed to delete single media.');

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
              logger.warn({ publicIds }, 'Unused medias not found or already processed.');
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
                { Requested: publicIds.length, Found: medias.length, PublicIDs: publicIds },
                'Some medias were already processed or not found.',
              );
            }
          } catch (error) {
            logger.error({ Error: error, Data: data }, 'Failed to delete multiple media.');

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
    try {
      await this.worker?.close();
      logger.info('✅ Worker manager stopped successfully');
    } catch (error) {
      logger.error(error, '❌ Failed to stop worker manager');
    }
  }
}
