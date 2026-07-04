import type { MongoConnectOptions } from '@beautinique/backend-mongoose';
import { winstonLogs } from '@beautinique/be-middlewares';

import { envs } from '../envs/index.js';

export const databaseConfigs: MongoConnectOptions = {
  uri: envs.mongo_uri,
  enableGlobalCache: envs.is_dev,
  options: { dbName: envs.database_name },
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
