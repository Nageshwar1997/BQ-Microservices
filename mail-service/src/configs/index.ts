import { winstonLogs } from '@beautinique/be-middlewares';

import { envs } from '../envs/index.js';

export const {
  error: errorLogs,
  logger,
  request: requestLogs,
} = winstonLogs({
  serviceName: envs.service_name,
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
