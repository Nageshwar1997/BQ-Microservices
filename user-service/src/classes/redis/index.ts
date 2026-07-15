import { type RedisClientType } from 'redis';

import { logger, redisClient } from '../../configs/index.js';
import { RedisCacheToken } from './RedisCacheToken.js';
import { RedisCacheUser } from './RedisCacheUser.js';

export class RedisCacheManager {
  private readonly client: RedisClientType;

  private isReady = false;

  public readonly user: RedisCacheUser;

  public readonly token: RedisCacheToken;

  constructor() {
    this.client = redisClient;

    const getClient = () => {
      if (!this.isReady) {
        logger.warn('⚠️ Redis client unavailable.');

        return null;
      }

      return this.client;
    };

    this.user = new RedisCacheUser(this.client, getClient);

    this.token = new RedisCacheToken(this.client, getClient);

    this.registerEvents();
  }

  private registerEvents() {
    this.client.on('connect', () => {
      logger.info('👍 Redis Connected');

      this.isReady = true;
    });

    this.client.on('error', (error) => {
      logger.error(error, '❌ Redis Error:');

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
    } catch (error) {
      logger.error(error, '❌ Redis connection failed:');

      this.isReady = false;
    }
  }

  public async close() {
    try {
      await this.client.quit();

      this.isReady = false;

      logger.info('🛑 Redis Cache Connection Closed');
    } catch (error) {
      logger.error(error, '❌ Redis close failed:');
    }
  }
}
