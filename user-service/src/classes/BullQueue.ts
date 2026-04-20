import { type ConnectionOptions, Queue } from 'bullmq';
import { logger } from '@/configs';
import { QUEUE_CONFIGS } from '@/constants';
import type { IQueueJob, TQueueKey } from '@/types';

class BullQueue {
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
        attempts: 3, // 🔁 Max 3 retries

        backoff: {
          type: 'exponential', // ⏳ smart retry delay
          delay: 2000, // ⏱️ 2 sec initial delay
        },

        removeOnComplete: {
          age: 30, // 🧹 Completed jobs will be removed after 30 seconds
          count: 5, // 📦 Keep only last 5 completed jobs (whichever limit hits first)
        },

        removeOnFail: {
          age: 1800, // 🧹 Failed jobs will be removed after 30 min (1800 sec)
          count: 10, // 📦 📦 Keep only last 10 failed jobs for debugging
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

export const bullQueue = new BullQueue();
