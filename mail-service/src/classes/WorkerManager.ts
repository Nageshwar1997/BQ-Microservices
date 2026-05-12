import { bullWorker } from '@beautinique/be-jobs';

import { envs } from '../envs';
import { transporter } from './Transporter';

class WorkerManager {
  /* ---------------- CONNECT ---------------- */
  private connect() {
    bullWorker.connect(envs.redis.job);
  }

  /* ---------------- RUN WORKERS ---------------- */
  private runWorkers() {
    bullWorker.createWorker({
      queueName: 'mail-queue',
      jobName: 'send-otp',
      handler: async (job) => await transporter.sendOtp(job.data.email, job.data.otp),
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
