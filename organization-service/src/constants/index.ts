import { API_METHODS_MAP } from '@beautinique/shared-constants';

import { envs } from '../envs/index.js';

const { GET, PATCH, POST } = API_METHODS_MAP;

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const CONTACT_QUERY_TYPES = [
  'order',
  'returns_refunds',
  'payment',
  'product_question',
  'become_seller',
  'account_help',
  'feedback',
  'other',
] as const;

export const CONTACT_QUERY_TYPE_MAP = Object.fromEntries(
  CONTACT_QUERY_TYPES.map((type) => [type, type]),
) as {
  readonly [K in (typeof CONTACT_QUERY_TYPES)[number]]: K;
};

export const CONTACT_QUERY_STATUS = ['open', 'resolved'] as const;

export const CONTACT_QUERY_STATUS_MAP = Object.fromEntries(
  CONTACT_QUERY_STATUS.map((status) => [status, status]),
) as {
  readonly [K in (typeof CONTACT_QUERY_STATUS)[number]]: K;
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
    updateStatus: { method: PATCH, path: '/:id' },
  },
} as const;
