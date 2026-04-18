import { type ConnectionOptions, Queue } from 'bullmq';
import { logger } from '@/configs';
import { QUEUE_CONFIGS } from '@/constants';
import type { IQueueJob, TQueueKey } from '@/types';

export class QueueService {
  private connection: ConnectionOptions;
  private queues = new Map<TQueueKey, Queue>();
  private isReady = false;

  constructor() {
    this.connection = QUEUE_CONFIGS;
  }

  /* ---------------- CONNECT ---------------- */

  public connect() {
    if (this.isReady) return;

    this.isReady = true;
    logger.info('📦 Queue Ready');
  }

  /* ---------------- CREATE QUEUE ---------------- */

  private createQueue(name: TQueueKey): Queue {
    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3, // 🔁 Maximum retry attempts if job fails

        backoff: {
          type: 'exponential', // ⏳ Delay increases exponentially on each retry
          delay: 2000, // ⏱️ Initial delay = 2 seconds
        },

        removeOnComplete: {
          age: 60, // 🧹 Completed jobs will be removed after 60 seconds
          count: 10, // 📦 Keep only last 10 completed jobs (whichever limit hits first)
        },

        removeOnFail: {
          age: 3600, // 🧹 Failed jobs will be removed after 1 hour (3600 sec)
          count: 20, // 📦 Keep only last 20 failed jobs for debugging
        },
      },
    });

    this.queues.set(name, queue);
    logger.info(`📦 Queue created → ${name}`);

    return queue;
  }

  /* ---------------- GET QUEUE ---------------- */

  private getQueue(name: TQueueKey): Queue {
    const queue = this.queues.get(name);

    if (!queue) {
      throw new Error(`Queue ${name} not found.`);
    }

    return queue;
  }

  /* ---------------- GET OR CREATE ---------------- */

  private getOrCreateQueue(name: TQueueKey): Queue {
    if (!this.isReady) {
      throw new Error('Queue not ready. Call connect() first.');
    }

    if (!this.queues.has(name)) {
      return this.createQueue(name);
    }

    return this.getQueue(name);
  }

  /* ---------------- ADD JOB ---------------- */

  public async addJob({ queueName, jobName, data, options }: IQueueJob) {
    const queue = this.getOrCreateQueue(queueName);

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
