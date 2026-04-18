import { type JobsOptions, Queue } from 'bullmq';
import { envs } from '@/envs';
import { logger } from '@/configs';

/* ---------------- TYPES ---------------- */

export interface IQueueJob<T = unknown> {
  name: string;
  data: T;
  options?: JobsOptions;
}

/* ---------------- SERVICE ---------------- */

export class QueueService {
  private connection;
  private emailQueue: Queue | null = null;
  private isReady = false;

  constructor() {
    this.connection = {
      host: envs.redis.queuing.host,
      port: envs.redis.queuing.port,
      password: envs.redis.queuing.password,
    };
  }

  /* ---------------- CONNECT ---------------- */

  public async connect() {
    try {
      if (this.isReady) return;

      this.emailQueue = new Queue('email-queue', {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      });

      await this.emailQueue.waitUntilReady();

      this.registerEvents();

      this.isReady = true;
      logger.info('📦 Queue Service Connected');
    } catch (err) {
      this.isReady = false;
      logger.error('❌ Queue connection failed:', err);
    }
  }

  /* ---------------- EVENTS ---------------- */

  private registerEvents() {
    if (!this.emailQueue) return;

    this.emailQueue.on('error', (err) => {
      logger.error('❌ Queue Error:', err);
    });

    this.emailQueue.on('waiting', (jobId) => {
      logger.info(`⏳ Job waiting: ${jobId}`);
    });
  }

  /* ---------------- GET QUEUE ---------------- */

  private getQueue(): Queue {
    if (!this.emailQueue || !this.isReady) {
      throw new Error('Queue not initialized. Call connect() first.');
    }
    return this.emailQueue;
  }

  /* ---------------- GENERIC ADD ---------------- */

  public async addJob<T>(job: IQueueJob<T>) {
    const queue = this.getQueue();

    try {
      const createdJob = await queue.add(job.name, job.data, job.options);
      logger.info(`✅ Job added → ${job.name} (${createdJob.id})`);
      return createdJob;
    } catch (err) {
      logger.error('❌ Failed to add job:', err);
      throw err;
    }
  }

  /* ---------------- EMAIL JOB (SPECIFIC) ---------------- */

  public async addEmailJob(data: { email: string; otp: string }) {
    return this.addJob({
      name: 'send-otp',
      data,
    });
  }

  /* ---------------- HEALTH CHECK ---------------- */

  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.emailQueue) return false;
      await this.emailQueue.waitUntilReady();
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- CLOSE ---------------- */

  public async close() {
    if (this.emailQueue) {
      await this.emailQueue.close();
      this.isReady = false;
      logger.warn('🛑 Queue Service Closed');
    }
  }
}
