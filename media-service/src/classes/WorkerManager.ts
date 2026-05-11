import { bullWorker } from '@beautinique/be-jobs';

import { envs } from '../envs';
import { cloudinary } from './Cloudinary';

class WorkerManager {
  /* ---------------- CONNECT ---------------- */
  private connect() {
    bullWorker.connect(envs.redis.queue);
  }

  /* ---------------- RUN WORKERS ---------------- */
  private runWorkers() {
    // During Upload Fail Handlers
    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'remove-single-media-directly',
      handler: async (job) => void (await cloudinary.removeSingle(job.data)),
    });

    bullWorker.createWorker({
      queueName: 'media-queue',
      jobName: 'remove-multiple-media-directly',
      handler: async (job) => void (await cloudinary.removeMultiple(job.data)),
    });
  }

  /* ---------------- START ---------------- */

  public start() {
    this.connect();
    this.runWorkers();
  }

  /* ---------------- CLOSE ---------------- */

  public async stop() {
    await bullWorker.closeAll();
  }
}

export const workerManager = new WorkerManager();
