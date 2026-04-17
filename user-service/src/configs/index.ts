import { createClient, RedisClientType } from 'redis';
import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { connection, ConnectOptions } from 'mongoose';
import { envs } from '@/envs';

export const databaseConfigs = {
  uri: envs.is_dev ? envs.mongo_uri.dev : envs.mongo_uri.prod,
  isDev: true,
  options: { dbName: 'user-service' } as ConnectOptions,
};

export const isDbConnected = () => connection.readyState === 1;

export const { errorLogger, logger, requestLogger } = LoggerMiddleware.createLogger({
  serviceName: 'User-Service',
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});

export const redisClientConfig: RedisClientType = createClient({
  socket: {
    host: envs.redis.host,
    port: Number(envs.redis.port),
    reconnectStrategy: (retries: number): number | false => {
      if (retries >= 5) {
        // Max reconnect attempts
        console.error('❌ Max Redis reconnection attempts reached');
        return false;
      }
      const delay = Math.min(retries * 1000, 10000); //10s
      console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries + 1})`);
      return delay;
    },
  },
  password: envs.redis.password,
});
