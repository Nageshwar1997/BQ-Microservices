import { winstonLogs } from '@beautinique/be-middlewares';
import { type ConnectOptions, connection } from 'mongoose';
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
