import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { envs } from '@/envs';
import { type ConnectOptions, connection } from 'mongoose';

export const databaseConfigs = {
  uri: envs.mongo_uri,
  isDev: envs.is_dev,
  options: { dbName: envs.database_name } as ConnectOptions,
};

export const isDbConnected = () => connection.readyState === 1;

export const { errorLogger, logger, requestLogger } = LoggerMiddleware.createLogger({
  serviceName: envs.service_name,
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
