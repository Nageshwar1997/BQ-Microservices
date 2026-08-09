import { API_METHODS_MAP, CONTACT_QUERY_STATUS_MAP, DAY } from '@beautinique/backend-constants';
import type { TContactQueryStatus } from '@beautinique/backend-types';

import { envs } from '../envs/index.js';

const { GET, PATCH, POST } = API_METHODS_MAP;

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

/**
 * How long a contact query is kept after landing in a terminal status,
 * before the `expiresAt` TTL index (see `contact.schema.ts`) sweeps it -
 * statuses not listed here (e.g. `OPENED`, `ANSWERED`) are never
 * auto-deleted.
 */
export const CONTACT_QUERY_RETENTION_MS_MAP: Partial<Record<TContactQueryStatus, number>> = {
  [CONTACT_QUERY_STATUS_MAP.CLOSED]: 2 * DAY,
  [CONTACT_QUERY_STATUS_MAP.REJECTED]: 5 * DAY,
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
  seller: {
    base: '/seller',
    updateApprovalStatus: { method: PATCH, path: '/:sellerId/approval-status' },
    draft: {
      base: '/draft',
      save: { method: POST, path: '/' }, // For saving a wizard step as draft
      get: { method: GET, path: '/' }, // For fetching the existing draft to prefill the wizard
      submit: { method: PATCH, path: '/submit' }, // Reassembles the draft and creates the Seller as PENDING
    },
  },
} as const;
