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

const BASE_METHODS_AND_PATHS = {
  get: { path: '/', method: 'get' },
  upload: { path: '/upload', method: 'post' },
  remove: { path: '/remove', method: 'delete' },
} as const;

export const GATEWAY_METHODS_AND_PATHS = {
  image: {
    base: '/image',
    single: { base: '/single', ...BASE_METHODS_AND_PATHS },
    multiple: { base: '/multiple', ...BASE_METHODS_AND_PATHS },
  },
  video: {
    base: '/video',
    single: { base: '/single', ...BASE_METHODS_AND_PATHS },
    multiple: { base: '/multiple', ...BASE_METHODS_AND_PATHS },
  },
} as const;

export const QUEUE_CONFIGS: ConnectionOptions = envs.redis.queue;

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
  'media-queue': [
    'single-image-remove',
    'single-video-remove',
    'multiple-image-remove',
    'multiple-video-remove',
  ],
} as const;
