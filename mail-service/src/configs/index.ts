import { createLogger } from '@beautinique/backend-logger';

import { NodemailerTransporter, WorkerManager } from '../classes/index.js';
import { LOGGER_BASE_OPTIONS } from '../constants/index.js';
import { envs } from '../envs/index.js';

export const logger = createLogger({
  ...LOGGER_BASE_OPTIONS,
  service: envs.service_name,
  logsDir: 'logs',
});

export const workerManager = new WorkerManager();

export const transporter = new NodemailerTransporter();
