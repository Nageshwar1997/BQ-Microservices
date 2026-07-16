import { type RedisClientType } from 'redis';

import { logger, redisClient } from '../configs/index.js';
import { RedisCategory } from './RedisCategory.js';
import { RedisDashboard } from './RedisDashboard.js';

class RedisCache {
  private readonly client: RedisClientType;

  private isReady = false;

  public readonly category: RedisCategory;

  public readonly dashboard: RedisDashboard;

  constructor() {
    this.client = redisClient;

    const getClient = () => {
      if (!this.isReady) {
        logger.warn('⚠️ Redis client unavailable.');

        return null;
      }

      return this.client;
    };

    this.category = new RedisCategory(this.client, getClient);

    this.dashboard = new RedisDashboard(this.client, getClient);

    this.registerEvents();
  }

  private registerEvents() {
    this.client.on('connect', () => {
      logger.info('👍 Redis Connected');

      this.isReady = true;
    });

    this.client.on('error', (err) => {
      logger.error(err, '❌ Redis Error:');

      this.isReady = false;
    });

    this.client.on('reconnecting', () => {
      logger.warn('⚠️ Redis Reconnecting');

      this.isReady = false;
    });

    this.client.on('end', () => {
      logger.warn('👋 Redis Connection Ended');

      this.isReady = false;
    });
  }

  public async connect() {
    try {
      await this.client.connect();
    } catch (err) {
      logger.error(err, '❌ Redis connection failed:');

      this.isReady = false;
    }
  }

  public async close() {
    try {
      await this.client.quit();

      this.isReady = false;

      logger.warn('🛑 Redis Cache Connection Closed');
    } catch (err) {
      logger.error(err, '❌ Redis close failed:');
    }
  }
}

export const redisCache = new RedisCache();
