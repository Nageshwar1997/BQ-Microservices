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

export const METHODS_AND_PATHS = {
  upload: {
    base: '/upload',
    single: { method: 'post', path: '/single' },
    multiple: { method: 'post', path: '/multiple' },
  },
} as const;
