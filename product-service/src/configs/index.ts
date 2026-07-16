import { createLogger } from '@beautinique/backend-logger';
import { winstonLogs } from '@beautinique/be-middlewares';
import mongoose, { type ConnectOptions, STATES } from 'mongoose';
import { createClient, type RedisClientType } from 'redis';

import { LOGGER_BASE_OPTIONS } from '../constants/index.js';
import { envs } from '../envs/index.js';

export const databaseConfigs = {
  uri: envs.mongo_uri ?? '',
  isDev: envs.is_dev,
  options: { dbName: envs.database_name } as ConnectOptions,
};

export const isDbConnected = () => mongoose.connection.readyState === STATES.connected;

export const {
  error: errorLogs,
  logger: _,
  request: requestLogs,
} = winstonLogs({
  serviceName: envs.service_name,
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});

export const logger = createLogger({
  ...LOGGER_BASE_OPTIONS,
  service: envs.service_name,
  logsDir: 'logs',
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
