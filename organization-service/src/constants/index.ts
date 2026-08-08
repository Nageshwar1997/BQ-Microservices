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

/* ---------------- SELLER ---------------- */

export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const SELLER_APPROVAL_STATUS_MAP = Object.fromEntries(
  SELLER_APPROVAL_STATUS.map((status) => [status, status]),
) as {
  readonly [K in (typeof SELLER_APPROVAL_STATUS)[number]]: K;
};

export const SELLER_STATUS = ['ACTIVE', 'SUSPENDED'] as const;

export const SELLER_STATUS_MAP = Object.fromEntries(SELLER_STATUS.map((status) => [status, status])) as {
  readonly [K in (typeof SELLER_STATUS)[number]]: K;
};

// Self-service seller onboarding wizard step order (frontend stepper form ids).
export const DRAFT_SELLER_STEP_MAP = {
  0: 'businessDetails',
  1: 'bankDetails',
  2: 'address',
  3: 'documents',
  4: 'review',
} as const;

export const SELLER_STEPPER_STEP_COUNT = Object.keys(DRAFT_SELLER_STEP_MAP).map(
  Number,
) as (keyof typeof DRAFT_SELLER_STEP_MAP)[];

export const SELLER_STEPPER_STEP_COUNT_MAP = Object.fromEntries(
  SELLER_STEPPER_STEP_COUNT.map((type) => [type, type]),
) as {
  [K in keyof typeof DRAFT_SELLER_STEP_MAP]: K;
};

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const BANK_ACCOUNT_NUMBER_REGEX = /^[0-9]{9,18}$/;

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
    create: { method: POST, path: '/' },
    draft: {
      base: '/draft',
      save: { method: POST, path: '/' }, // For saving a wizard step as draft
      get: { method: GET, path: '/' }, // For fetching the existing draft to prefill the wizard
    },
  },
} as const;
