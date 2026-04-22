import { envs } from '@/envs';
import type { FILE_MIME } from '@beautinique/be-constants';
import type { ConnectionOptions } from 'bullmq';
import type { ImageFormat } from 'cloudinary';

export const ORIGINS = Object.values(envs.url.frontend);

export const MIME_TO_FORMAT: Record<(typeof FILE_MIME.IMAGE)[number], ImageFormat> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
} as const;

export const GATEWAY_METHODS_AND_PATHS = {
  single: {
    base: '/single',
    get: { path: '/', method: 'get' },
    upload: { path: '/upload', method: 'post' },
    remove: { path: '/remove', method: 'delete' },
  },
  multiple: {
    base: '/multiple',
    get: { path: '/', method: 'get' },
    upload: { path: '/upload', method: 'post' },
    remove: { path: '/remove', method: 'delete' },
  },
} as const;

export const QUEUE_CONFIGS: ConnectionOptions = envs.redis.queue;

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
  'cloudinary-image-queue': [
    'single-image-remover',
    'multiple-image-remover',
    'single-image-uploader',
    'multiple-image-uploader',
  ],
} as const;
