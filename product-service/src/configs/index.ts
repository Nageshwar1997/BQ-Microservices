import { winstonLogs } from '@beautinique/be-middlewares';
import { type ConnectOptions, connection } from 'mongoose';
import { type RedisClientType, createClient } from 'redis';
import { envs } from '../envs';

export const databaseConfigs = {
  uri: envs.mongo_uri,
  isDev: envs.is_dev,
  options: { dbName: envs.database_name } as ConnectOptions,
};

export const isDbConnected = () => connection.readyState === 1;

export const {
  error: errorLogs,
  logger,
  request: requestLogs,
} = winstonLogs({
  serviceName: envs.service_name,
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
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

      logger.info(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries + 1})`);

      return delay;
    },
  },

  username: envs.redis.cache.username,
  password: envs.redis.cache.password,
});
