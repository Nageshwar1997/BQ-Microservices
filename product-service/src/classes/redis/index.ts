import { type RedisClientType } from 'redis';

import { logger, redisClient } from '../../configs/index.js';
import { RedisCacheAssignment } from './RedisCacheAssignment.js';
import { RedisCacheCategory } from './RedisCacheCategory.js';
import { RedisCacheDashboard } from './RedisCacheDashboard.js';

export class RedisCacheManager {
  private readonly client: RedisClientType;

  private isReady = false;

  public readonly assignment: RedisCacheAssignment;

  public readonly category: RedisCacheCategory;

  public readonly dashboard: RedisCacheDashboard;

  constructor() {
    this.client = redisClient;

    const getClient = () => {
      if (!this.isReady) {
        logger.warn('⚠️ Redis client unavailable.');

        return null;
      }

      return this.client;
    };

    this.assignment = new RedisCacheAssignment(this.client, getClient);

    this.category = new RedisCacheCategory(this.client, getClient);

    this.dashboard = new RedisCacheDashboard(this.client, getClient);

    this.registerEvents();
  }

  private registerEvents() {
    this.client.on('connect', () => {
      logger.info('✅ Redis connection established');

      this.isReady = true;
    });

    this.client.on('error', (error) => {
      logger.error(error, '❌ Redis connection failed:');

      this.isReady = false;
    });

    this.client.on('reconnecting', () => {
      logger.warn('⚠️  Redis reconnecting...');

      this.isReady = false;
    });

    this.client.on('end', () => {
      logger.info('👋 Redis connection closed. Client is no longer connected.');

      this.isReady = false;
    });
  }

  public async connect() {
    try {
      await this.client.connect();

      logger.info('✅ Redis client connected successfully.');
    } catch (error) {
      logger.error(error, '❌ Redis connection failed:');

      this.isReady = false;
    }
  }

  public async close() {
    try {
      await this.client.quit();

      logger.info('✅ Redis client disconnected successfully.');

      this.isReady = false;
    } catch (error) {
      logger.error(error, '❌ Redis disconnection failed:');
    }
  }
}
