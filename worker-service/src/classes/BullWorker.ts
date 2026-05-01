import type { TSendOtpMail } from '@beautinique/be-zod';
import { type Job, Worker } from 'bullmq';
import { logger } from '../configs';
import { WORKER_CONFIGS } from '../constants';
import type { IMedia, TJobName, TQueueKey, TResourceType } from '../types';
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
      case 'single-media-remove': {
        await this.executeJob(jobName, async () => {
          const payload = data as { publicId: string; resourceType: TResourceType };
          logger.info(`📡 Removing Single Media -> Media Service -> ${job.id}`);
          await mediaService.singleMediaRemove(payload);
          logger.info(`✅ Removed Single Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'multiple-media-remove': {
        await this.executeJob(jobName, async () => {
          const payload = data as { publicIds: string[]; resourceType: TResourceType };
          logger.info(`📡 Removing Multiple Media -> Media Service -> ${job.id}`);
          await mediaService.multipleMediaRemove(payload);
          logger.info(`✅ Removed Multiple Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'mark-as-unused-single-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as IMedia;
          logger.info(
            `📡 Creating and Marking as Unused Single Media -> Media Service -> ${job.id}`,
          );
          await mediaService.createUnusedSingleMedia(payload);
          logger.info(`✅ Created and Marked as Unused Single Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'mark-as-unused-multiple-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as IMedia;
          logger.info(
            `📡 Creating and Marking as Unused Multiple Media -> Media Service -> ${job.id}`,
          );
          await mediaService.createUnusedMultipleMedia(payload);
          logger.info(
            `✅ Created and Marked as Unused Multiple Media -> Media Service -> ${job.id}`,
          );
        });
        break;
      }

      case 'mark-as-used-single-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as Partial<IMedia>;
          logger.info(`📡 Marking as Used Single Media -> Media Service -> ${job.id}`);
          await mediaService.markAsUsedSingleMedia(payload);
          logger.info(`✅ Marked as Used Single Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'mark-as-used-multiple-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as Partial<IMedia>;
          logger.info(`📡 Marking as Used Multiple Media -> Media Service -> ${job.id}`);
          await mediaService.markAsUsedMultipleMedia(payload);
          logger.info(`✅ Marked as Used Multiple Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'mark-as-deleted-single-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as Partial<IMedia>;
          logger.info(`📡 Marking as Deleted Single Media -> Media Service -> ${job.id}`);
          await mediaService.markAsDeletedSingleMedia(payload);
          logger.info(`✅ Marked as Deleted Single Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'mark-as-deleted-multiple-media': {
        await this.executeJob(jobName, async () => {
          const payload = data as Partial<IMedia>;
          logger.info(`📡 Marking as Deleted Multiple Media -> Media Service -> ${job.id}`);
          await mediaService.markAsDeletedMultipleMedia(payload);
          logger.info(`✅ Marked as Deleted Multiple Media -> Media Service -> ${job.id}`);
        });
        break;
      }

      case 'single-media-remove-if-unused': {
        await this.executeJob(jobName, async () => {
          const { publicId, resourceType } = data as Pick<IMedia, 'publicId' | 'resourceType'>;

          logger.info(`📡 Checking unused media -> ${job.id}`);

          // 🔍 DB check
          const media = await mediaService.getSingleMedia(publicId);

          if (!media) return;

          if (media.isUsed) {
            logger.info(`⏭️ Skip delete (already used) -> ${job.id}`);
            return;
          }

          // ✅ If unused then → delete
          await mediaService.singleMediaRemove({ publicId, resourceType });

          logger.info(`🗑️ Deleted unused single media -> ${job.id}`);
        });

        break;
      }

      case 'multiple-media-remove-if-unused': {
        await this.executeJob(jobName, async () => {
          const publicIds = data as string[];

          // 🔍 Get media from Media Service DB
          const medias = await mediaService.getMultipleMedia(publicIds);

          if (medias.length === 0) return;

          // ❌ skip if already used
          const unusedMedias = medias.filter((m: IMedia) => !m.isUsed);

          // 🗑️ remove only unused
          const publicIdsToDelete = unusedMedias.map((m: IMedia) => m.publicId);

          if (publicIdsToDelete.length > 0) {
            await mediaService.multipleMediaRemove({
              publicIds: publicIdsToDelete,
              resourceType: unusedMedias[0].resourceType, //
            });
          }

          logger.info(`🗑️ Deleted unused multiple media -> ${job.id}`);
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
