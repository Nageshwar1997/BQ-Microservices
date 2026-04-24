import { type Job, Worker } from 'bullmq';
import { WORKER_CONFIGS } from '@/constants';
import { logger } from '@/configs';
import type { IBaseMedia, TJobName, TQueueKey } from '@/types';
import type { TSendOtpMail } from '@beautinique/be-zod';
import { mailService } from './apis';
import { mediaService } from './apis/MediaService';

/* ---------------- SERVICE ---------------- */

class BullWorker {
  private workers = new Map<TQueueKey, Worker>();

  /* ---------------- START WORKER ---------------- */

  public startWorker(queueName: TQueueKey) {
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

          case 'media-queue':
            await this.handleMediaJobs(job);
            break;

          default:
            throw new Error(`Unknown queue: ${queueName}`);
        }
      },
      {
        connection: WORKER_CONFIGS,

        concurrency: 3, // 🔥 Handed 3 jobs parallel (Reduced for free Redis + SMTP safety)

        limiter: {
          max: 10, // ⏱️ Maximum 10 jobs
          duration: 1000, // ⏱️ Per second
        }, // 🔒 VERY IMPORTANT: (Stop SMTP blockage)
      },
    );

    this.registerEvents(worker, queueName);

    this.workers.set(queueName, worker);

    logger.info(`🚀 Worker started → ${queueName}`);
  }

  /* ---------------- START ALL ---------------- */

  public startAll() {
    this.startWorker('email-queue');
    this.startWorker('media-queue');

    // Add more workers here
  }

  /* ---------------- HELPERS ---------------- */
  private async executeJob(jobName: string, handler: () => Promise<void>) {
    try {
      await handler();
    } catch (err) {
      logger.error(`❌ Job failed → ${jobName}`, err);
      throw err;
    }
  }

  /* ---------------- HANDLERS ---------------- */

  private async handleEmailJobs(job: Job) {
    const { data } = job;
    const jobName = job.name as TJobName<'email-queue'>;

    switch (jobName) {
      case 'send-otp': {
        await this.executeJob(jobName, async () => {
          const { email, otp } = data as TSendOtpMail;
          logger.info(`📡 Sending OTP -> Mail Service -> ${job.id}`);
          await mailService.sendOtp({ email, otp });
          logger.info(`✅ Sent OTP -> Mail Service -> ${job.id}`);
        });
        break;
      }

      default:
        throw new Error(`🚫 Unknown email job: ${jobName}`);
    }
  }

  private async handleMediaJobs(job: Job) {
    const { data } = job;
    const jobName = job.name as TJobName<'media-queue'>;

    switch (jobName) {
      case 'single-image-remove': {
        await this.executeJob(jobName, async () => {
          const { publicId } = data;
          logger.info(`📡 Removing Image -> Media Service -> ${job.id}`);
          await mediaService.singleImageRemove(publicId);
          logger.info(`✅ Removed Image -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'create-single-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as IBaseMedia;
          logger.info(`📡 Creating Single Media -> Media Service -> ${job.id}`);
          await mediaService.createSingleMedia(payload);
          logger.info(`✅ Created Single Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'create-multiple-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as IBaseMedia[];

          logger.info(`📡 Creating Multiple Media -> Media Service -> ${job.id}`);
          await mediaService.createMultipleMedia(payload);
          logger.info(`✅ Created Multiple Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      default:
        throw new Error(`🚫 Unknown media job: ${jobName}`);
    }
  }

  /* ---------------- EVENTS ---------------- */

  private registerEvents(worker: Worker, queueName: TQueueKey) {
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

  public async closeWorker(queueName: TQueueKey) {
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

export const bullWorker = new BullWorker();
