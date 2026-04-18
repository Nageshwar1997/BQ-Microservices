import { type ConnectionOptions, type JobsOptions, Queue } from 'bullmq';
import { logger } from '@/configs';
import { QUEUE_CONFIGS } from '@/constants';

type TQueueKey = 'connection-check';

export class QueueService {
  private connection: ConnectionOptions;
  private queues = new Map<TQueueKey, Queue>();
  private isReady = false;

  constructor() {
    this.connection = QUEUE_CONFIGS;
  }

  /* ---------------- CONNECT ---------------- */

  public async connect() {
    try {
      if (this.isReady) return;

      // 🔌 connection test (single)
      const testQueue = new Queue('connection-check', {
        connection: this.connection,
      });

      await testQueue.waitUntilReady();
      await testQueue.close();

      this.isReady = true;
      logger.info('📦 Queue Connected');
    } catch (err) {
      this.isReady = false;
      logger.error('❌ Queue connection failed:', err);
      throw err;
    }
  }

  /* ---------------- GET OR CREATE QUEUE ---------------- */

  private getQueue(name: TQueueKey): Queue {
    if (!this.isReady) {
      throw new Error('Queue not ready. Call connect() first.');
    }

    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      });

      this.queues.set(name, queue);
      logger.info(`📦 Queue created → ${name}`);
    }

    const queue = this.queues.get(name);

    if (!queue) {
      throw new Error(`Queue ${name} not found.`);
    }

    return queue;
  }

  /* ---------------- ADD JOB ---------------- */

  public async addJob<T>(queueName: TQueueKey, jobName: string, data: T, options?: JobsOptions) {
    const queue = this.getQueue(queueName);

    try {
      const job = await queue.add(jobName, data, options);
      logger.info(`✅ Job added → ${queueName}:${jobName} (${job.id})`);
      return job;
    } catch (err) {
      logger.error('❌ Failed to add job:', err);
      throw err;
    }
  }

  /* ---------------- CLOSE ---------------- */

  public async close() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    this.queues.clear();
    this.isReady = false;

    logger.warn('🛑 All Queues Closed');
  }
}
