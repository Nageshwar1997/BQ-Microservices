import { API_METHODS_MAP } from '@beautinique/shared-constants';

import type { TMediaResource } from '../types/index.js';

export const HEADERS_KEYS = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
} as const;

export const MEDIA_RESOURCES = ['image', 'video'] as const;

export const MEDIA_RESOURCE_MAP = Object.fromEntries(
  MEDIA_RESOURCES.map((resource) => [resource, resource]),
) as { readonly [K in TMediaResource]: K };

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
