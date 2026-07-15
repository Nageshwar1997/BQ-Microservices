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
      logger.info('✅ Redis connected');

      this.isReady = true;
    });

    this.client.on('error', (error) => {
      logger.error(error, '❌ Redis Error:');

      this.isReady = false;
    });

    this.client.on('reconnecting', () => {
      logger.warn('⚠️  Redis Reconnecting');

      this.isReady = false;
    });

    this.client.on('end', () => {
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
    await this.client.quit();

    this.isReady = false;
  }
}
