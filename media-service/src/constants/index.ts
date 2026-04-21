import { envs } from '@/envs';
import type { ConnectionOptions } from 'bullmq';

export const ORIGINS = Object.values(envs.url.frontend);

export const MIME_TO_FORMAT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
} as const;

export const GATEWAY_METHODS_AND_PATHS = {
  image: {
    base: '/image',
    single: {
      base: '/single',
      get: { path: '/', method: 'get' },
      upload: { path: '/upload', method: 'post' },
    },
    multi: {
      base: '/multi',
      get: { path: '/', method: 'get' },
      upload: { path: '/upload', method: 'post' },
    },
  },
  video: {
    base: '/video',
    single: {
      base: '/single',
      get: { path: '/', method: 'get' },
      upload: { path: '/upload', method: 'post' },
    },
    multi: {
      base: '/multi',
      get: { path: '/', method: 'get' },
      upload: { path: '/upload', method: 'post' },
    },
  },
} as const;

export const QUEUE_CONFIGS: ConnectionOptions = envs.redis.queue;

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
} as const;
