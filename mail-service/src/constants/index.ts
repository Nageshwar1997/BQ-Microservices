import { API_METHODS_MAP } from '@beautinique/shared-constants';

import { envs } from '../envs/index.js';

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const METHODS_AND_PATHS = {
  home: { method: API_METHODS_MAP.GET, path: '/' },
  health: { method: API_METHODS_MAP.GET, path: '/health' },
  wakeUp: { method: API_METHODS_MAP.GET, path: '/wake-up' },
} as const;
