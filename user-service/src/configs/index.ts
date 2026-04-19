import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { envs } from '@/envs';
import { type ConnectOptions, connection } from 'mongoose';

export const databaseConfigs = {
  uri: envs.mongo_uri,
  isDev: envs.is_dev,
  options: { dbName: 'user-service' } as ConnectOptions,
};

export const isDbConnected = () => connection.readyState === 1;

export const { errorLogger, logger, requestLogger } = LoggerMiddleware.createLogger({
  serviceName: 'User-Service',
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
