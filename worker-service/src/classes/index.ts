import { Worker, Job } from 'bullmq';
import { WORKER_CONFIGS } from '@/constants';
import { logger } from '@/configs';
import type { TWorkerKey } from '@/types';

/* ---------------- SERVICE ---------------- */

export class WorkerService {
  private workers = new Map<TWorkerKey, Worker>();

  /* ---------------- START WORKER ---------------- */

  public startWorker(queueName: TWorkerKey) {
    if (this.workers.has(queueName)) {
      logger.warn(`⚠️ Worker already running → ${queueName}`);
      return;
    }

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        logger.info(`📩 Processing ${queueName} → ${job.name}`);

        switch (queueName) {
          case 'email-queue':
            await this.handleEmailJobs(job);
            break;

          default:
            throw new Error(`Unknown queue: ${queueName}`);
        }
      },
      {
        connection: WORKER_CONFIGS,
        concurrency: 5,
      },
    );

    this.registerEvents(worker, queueName);

    this.workers.set(queueName, worker);

    logger.info(`🚀 Worker started → ${queueName}`);
  }

  /* ---------------- START ALL ---------------- */

  public startAll() {
    this.startWorker('email-queue');

    // Add more workers here
  }

  /* ---------------- HANDLERS ---------------- */

  private async handleEmailJobs(job: Job) {
    switch (job.name) {
      case 'send-otp':
        console.log('📧 Sending OTP:', job.data);
        break;

      default:
        throw new Error(`Unknown email job: ${job.name}`);
    }
  }

  /* ---------------- EVENTS ---------------- */

  private registerEvents(worker: Worker, queueName: TWorkerKey) {
    worker.on('completed', (job) => {
      logger.info(`✅ ${queueName} completed: ${job.name}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`❌ ${queueName} failed: ${job?.name}`, err);
    });

    worker.on('error', (err) => {
      logger.error(`❌ ${queueName} worker error:`, err);
    });
  }

  /* ---------------- CLOSE ONE ---------------- */

  public async closeWorker(queueName: TWorkerKey) {
    const worker = this.workers.get(queueName);
    if (!worker) return;

    await worker.close();
    this.workers.delete(queueName);

    logger.warn(`🛑 Worker closed → ${queueName}`);
  }

  /* ---------------- CLOSE ALL ---------------- */

  public async closeAll() {
    for (const [queueName, worker] of this.workers) {
      await worker.close();
      logger.warn(`🛑 Worker closed → ${queueName}`);
    }

    this.workers.clear();
  }
}
