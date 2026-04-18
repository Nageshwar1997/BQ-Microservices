import { type JobsOptions, Queue } from 'bullmq';
import { envs } from '@/envs';
import { logger } from '@/configs';

interface IQueueJob<T = unknown> {
  name: string;
  data: T;
  options?: JobsOptions;
}

export class QueueService {
  private connection;
  private emailQueue: Queue;

  constructor() {
    this.connection = {
      host: envs.redis.queuing.host,
      port: Number(envs.redis.queuing.port),
      password: envs.redis.queuing.password,
      tls: {},
    };

    // 📧 Email Queue
    this.emailQueue = new Queue('email-queue', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    });

    logger.info('📦 Queue Service Initialized');
  }

  /* ---------------- ADD JOB ---------------- */

  public async addEmailJob<T>(job: IQueueJob<T>) {
    try {
      await this.emailQueue.add(job.name, job.data, job.options);
      logger.info(`✅ Job added to email-queue → ${job.name}`);
    } catch (err) {
      logger.error('❌ Failed to add email job:', err);
    }
  }

  /* ---------------- HEALTH CHECK ---------------- */

  public async isHealthy(): Promise<boolean> {
    try {
      await this.emailQueue.waitUntilReady();
      return true;
    } catch (err) {
      logger.error('❌ Queue not ready:', err);
      return false;
    }
  }

  /* ---------------- CLOSE ---------------- */

  public async close() {
    await this.emailQueue.close();
  }
}
