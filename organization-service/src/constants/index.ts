import {
  API_METHODS_MAP,
  type CONTACT_QUERY_STATUS,
  CONTACT_QUERY_STATUS_MAP,
} from '@beautinique/backend-constants';

import { envs } from '../envs/index.js';

const { GET, PATCH, POST } = API_METHODS_MAP;

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long a contact query is kept after landing in a terminal status,
 * before the `expiresAt` TTL index (see `contact.schema.ts`) sweeps it -
 * statuses not listed here (e.g. `OPENED`, `ANSWERED`) are never
 * auto-deleted.
 */
export const CONTACT_QUERY_RETENTION_MS_MAP: Partial<
  Record<(typeof CONTACT_QUERY_STATUS)[number], number>
> = {
  [CONTACT_QUERY_STATUS_MAP.CLOSED]: 2 * DAY_MS,
  [CONTACT_QUERY_STATUS_MAP.REJECTED]: 5 * DAY_MS,
};

export const SUPPORT_INBOX_EMAIL = envs.support_inbox_email;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: GET, path: '/' },
  health: { method: GET, path: '/health' },
  wakeUp: { method: GET, path: '/wake-up' },
  team: {
    base: '/team',
    team: { method: GET, path: '/session' },
  },
  contact: {
    base: '/contact',
    create: { method: POST, path: '/' },
    list: { method: GET, path: '/' },
    updateStatus: { method: PATCH, path: '/:ticketId' },
  },
} as const;
