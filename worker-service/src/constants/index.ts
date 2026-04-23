import { envs } from '@/envs';
import type { ConnectionOptions } from 'bullmq';

export const ORIGINS = Object.values(envs.url.frontend);

export const WORKER_CONFIGS: ConnectionOptions = envs.redis.worker;

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
  'media-queue': [
    'single-image-remove',
    'single-video-remove',
    'multiple-image-remove',
    'multiple-video-remove',
  ],
} as const;

export const API_ROUTES_AND_METHODS = {
  mail: {
    sendOtp: { url: '/send-otp', method: 'POST' },
  },
  media: {
    image: {
      single: {
        remove: { path: '/image/single/remove', method: 'DELETE' },
      },
      multiple: {
        remove: { path: '/image/multiple/remove', method: 'DELETE' },
      },
    },
  },
};
