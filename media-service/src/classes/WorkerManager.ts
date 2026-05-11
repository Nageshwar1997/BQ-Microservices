import { bullWorker } from '@beautinique/be-jobs';

import { logger } from '../configs';
import { envs } from '../envs';
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
      options: {
        concurrency: 3,
      },

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
