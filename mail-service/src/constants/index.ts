import { envs } from '../envs/index.js';

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;
