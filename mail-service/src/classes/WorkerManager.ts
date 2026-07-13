import { bullWorker } from '@beautinique/be-jobs';

import { envs } from '../envs/index.js';
import { transporter } from './Transporter.js';

class WorkerManager {
  /* ---------------- CONNECT ---------------- */
  private connect() {
    bullWorker.connect(envs.redis.bull_mq);
  }

  /* ---------------- RUN WORKERS ---------------- */
  private runWorkers() {
    bullWorker.createWorker({
      queueName: 'mail-queue',
      jobName: 'send-otp',
      handler: async (job) => {
        await transporter.sendOtp(job.data.email, job.data.otp);
      },
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
