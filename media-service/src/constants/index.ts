import { API_METHODS_MAP } from '@beautinique/shared-constants';

import { envs } from '../envs/index.js';

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  upload: {
    base: '/upload',
    single: { method: API_METHODS_MAP.POST, path: '/single' },
    multiple: { method: API_METHODS_MAP.POST, path: '/multiple' },
  },
} as const;

const MINUTE = 60 * 1000;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export const CLEANUP_DELAY = 2 * DAY;
