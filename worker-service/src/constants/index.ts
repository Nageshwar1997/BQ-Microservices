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
    'create-single-media',
    'create-multiple-media',
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
    media: {
      create: {
        single: { url: '/media/create/single', method: 'POST' },
        multiple: { url: '/media/create/multiple', method: 'POST' },
      },
    },
  },
};

export const SERVICES = ['user-service'] as const;

export const RESOURCES = ['image', 'video'] as const;

export const STATUSES = ['PENDING', 'USED', 'DELETED'] as const;
