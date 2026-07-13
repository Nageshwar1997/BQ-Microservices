import { API_METHODS_MAP } from '@beautinique/shared-constants';

import { envs } from '../envs/index.js';

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: API_METHODS_MAP.GET, path: '/' },
  health: { method: API_METHODS_MAP.GET, path: '/health' },
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

/**
 * Extra time (in seconds) MongoDB's TTL monitor waits *after* `expiresAt`
 * before it deletes a `Media` document.
 *
 * The BullMQ `delete-single-media`/`delete-multiple-media` jobs are the
 * primary cleanup path (they also remove the Cloudinary asset) and are
 * scheduled with the exact same `CLEANUP_DELAY`, so they become eligible
 * to run at essentially the same wall-clock time as the TTL threshold.
 * Without this buffer, MongoDB's TTL monitor can delete the document
 * first, so the job later finds nothing to clean up and the Cloudinary
 * asset is orphaned. The TTL index should only fire as a last-resort
 * safety net for jobs that never ran (e.g. exhausted retries).
 */
export const TTL_SAFETY_BUFFER_SECONDS = DAY / 1000;
