import { envs } from '@/envs';
import type { FILE_MIME } from '@beautinique/be-constants';
import type { ConnectionOptions } from 'bullmq';
import type { VideoFormat } from 'cloudinary';

export const ORIGINS = Object.values(envs.url.frontend);

export const MIME_TO_FORMAT: Record<(typeof FILE_MIME.VIDEO)[number], VideoFormat> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
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
    'single-image-remove',
    'multiple-image-remove',
    'single-image-upload',
    'multiple-image-upload',
  ],
  'cloudinary-video-queue': [
    'single-video-remove',
    'multiple-video-remove',
    'single-video-upload',
    'multiple-video-upload',
  ],
} as const;
