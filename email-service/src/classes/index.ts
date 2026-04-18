import { type Job, Worker } from 'bullmq';
import { WORKER_CONFIGS } from '@/constants';
import { logger } from '@/configs';

export class WorkerService {
  private worker: Worker | null = null;

  public start() {
    this.worker = new Worker(
      'connection-check', // ⚠️ same queue name
      async (job: Job) => {
        logger.info(`📩 Processing job → ${job.name}`);

        switch (job.name) {
          case 'test-job':
            await this.handleTestJob(job.data);
            break;

          default:
            throw new Error(`Unknown job: ${job.name}`);
        }
      },
      {
        connection: WORKER_CONFIGS,
        concurrency: 5, // 🔥 parallel processing
      },
    );

    this.registerEvents();

    logger.info('🚀 Email Worker Started');
  }

  /* ---------------- JOB HANDLERS ---------------- */

  private async handleTestJob(data: any) {
    console.log('📨 Job Data:', data);

    // 👉 yaha actual email send karoge later
  }

  /* ---------------- EVENTS ---------------- */

  private registerEvents() {
    if (!this.worker) return;

    this.worker.on('completed', (job) => {
      logger.info(`✅ Job completed: ${job.name}`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`❌ Job failed: ${job?.name}`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('❌ Worker error:', err);
    });
  }

  /* ---------------- CLOSE ---------------- */

  public async close() {
    if (this.worker) {
      await this.worker.close();
      logger.warn('🛑 Worker Closed');
    }
  }
}
