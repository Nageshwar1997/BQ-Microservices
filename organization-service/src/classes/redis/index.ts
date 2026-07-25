import { type RedisClientType } from 'redis';

import { logger, redisClient } from '../../configs/index.js';

export class RedisCacheManager {
  private readonly client: RedisClientType;

  private isReady = false;

  // public readonly team: RedisCacheTeam;

  constructor() {
    this.client = redisClient;

    // const getClient = () => {
    //   if (!this.isReady) {
    //     logger.warn('⚠️ Redis client unavailable.');

    //     return null;
    //   }

    //   return this.client;
    // };

    // this.team = new RedisCacheTeam(this.client, getClient);

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
    // TODO: Remove this logger
    logger.info(this.isReady);
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
