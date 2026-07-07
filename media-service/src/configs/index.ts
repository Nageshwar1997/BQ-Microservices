import { createLogger } from '@beautinique/backend-logger';
import type { MongoConnectOptions } from '@beautinique/backend-mongoose';

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
});
