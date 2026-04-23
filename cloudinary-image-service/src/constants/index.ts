import { envs } from '@/envs';
import type { TResourceType } from '@/types';
import type { ConnectionOptions } from 'bullmq';

export const ORIGINS = Object.values(envs.url.frontend);

export const MIME_TO_FORMAT: Record<TResourceType, Record<string, string>> = {
  image: {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  },
  video: { 'video/mp4': 'mp4', 'video/webm': 'webm' },
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
  'media-queue': ['single-remove', 'multiple-remove'],
} as const;
