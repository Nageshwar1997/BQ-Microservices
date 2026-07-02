import { winstonLogs } from '@beautinique/be-middlewares';
import mongoose, { type ConnectOptions, STATES } from 'mongoose';

import { envs } from '../envs/index.js';

export const databaseConfigs = {
  uri: envs.mongo_uri,
  isDev: envs.is_dev,
  options: { dbName: envs.database_name } as ConnectOptions,
};

export const isDbConnected = () => {
  return mongoose.connection.readyState === STATES.connected;
};

export const {
  error: errorLogs,
  logger,
  request: requestLogs,
} = winstonLogs({
  serviceName: envs.service_name,
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
