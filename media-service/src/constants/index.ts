import type { TMediaResource } from '@beautinique/be-constants';

export const HEADERS_KEYS = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
} as const;

export const MIME_TO_FORMAT: Record<TMediaResource, Record<string, string>> = {
  image: {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  },
  video: { 'video/mp4': 'mp4', 'video/webm': 'webm' },
} as const;

export const METHOD_MAP = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1/media-service',
  home: { method: METHOD_MAP.GET, path: '/' },
  health: { method: METHOD_MAP.GET, path: '/health' },
  upload: {
    base: '/upload',
    single: { method: METHOD_MAP.POST, path: '/single' },
    multiple: { method: METHOD_MAP.POST, path: '/multiple' },
  },
} as const;
