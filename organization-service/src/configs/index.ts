import { JobProducer } from '@beautinique/backend-bullmq';
import { createLogger } from '@beautinique/backend-logger';
import type { MongoConnectOptions } from '@beautinique/backend-mongoose';
import { createClient, type RedisClientType } from 'redis';

import { RedisCacheManager, UserServiceApi, WorkerManager } from '../classes/index.js';
import { LOGGER_BASE_OPTIONS } from '../constants/index.js';
import { envs } from '../envs/index.js';

export const databaseConfigs: MongoConnectOptions = {
  uri: envs.mongo_uri,
  enableGlobalCache: envs.is_dev,
  options: { dbName: envs.database_name },
};

export const logger = createLogger({
  ...LOGGER_BASE_OPTIONS,
  service: envs.service_name,
  logsDir: 'logs',
});

export const jobProducer = new JobProducer({
  connection: envs.redis.bull_mq,
  logger,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 30, count: 5 },
    removeOnFail: { age: 1800, count: 10 },
  },
  queueOptions: {},
});

export const redisClient: RedisClientType = createClient({
  socket: {
    host: envs.redis.cache.host,
    port: envs.redis.cache.port,
    reconnectStrategy: (retries: number): number | false => {
      if (retries >= 5) {
        logger.error('❌ Max Redis reconnection attempts reached');

        return false;
      }

      const delay = Math.min(retries * 1000, 10000);

      logger.info(`🔄 Redis reconnecting in ${String(delay)}ms (attempt ${String(retries + 1)})`);

      return delay;
    },
  },

  username: envs.redis.cache.username,
  password: envs.redis.cache.password,
});

export const redisCacheManager = new RedisCacheManager();

export const userServiceApi = new UserServiceApi();

export const workerManager = new WorkerManager();
