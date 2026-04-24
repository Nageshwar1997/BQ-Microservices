import { envs } from '@/envs';
import type { ConnectionOptions } from 'bullmq';

export const ORIGINS = Object.values(envs.url.frontend);

export const WORKER_CONFIGS: ConnectionOptions = envs.redis.worker;

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
  'media-queue': [
    // Cloudinary Job Names
    'single-media-remove',
    'multiple-media-remove',
    'single-media-remove-if-unused',
    'multiple-media-remove-if-unused',

    // Database Job Names
    'mark-as-unused-single-media',
    'mark-as-unused-multiple-media',
    'mark-as-used-single-media',
    'mark-as-used-multiple-media',
    'mark-as-deleted-single-media',
    'mark-as-deleted-multiple-media',
  ],
} as const;

export const API_ROUTES_AND_METHODS = {
  mail: {
    sendOtp: { url: '/send-otp', method: 'POST' },
  },
  media: {
    mark_as_unused: {
      single: { method: 'post', path: '/mark-as-unused/single' },
      multiple: { method: 'post', url: '/mark-as-unused/multiple' },
    },
    mark_as_used: {
      single: { method: 'patch', url: '/mark-as-used/single' },
      multiple: { method: 'patch', url: '/mark-as-used/multiple' },
    },
    mark_as_deleted: {
      single: { method: 'delete', url: '/mark-as-deleted/single' },
      multiple: { method: 'delete', url: '/mark-as-deleted/multiple' },
    },
    get_non_deleted: {
      single: { method: 'get', url: '/get-non-deleted/single' },
      multiple: { method: 'get', url: '/get-non-deleted/multiple' },
    },
    cloudinary_upload: {
      single: { method: 'post', url: '/cloudinary-upload/single' },
      multiple: { method: 'post', url: '/cloudinary-upload/multiple' },
    },
    cloudinary_remove: {
      single: { method: 'delete', url: '/cloudinary-remove/single' },
      multiple: { method: 'delete', url: '/cloudinary-remove/multiple' },
    },
  },
};

export const SERVICES = ['user-service'] as const;

export const RESOURCES = ['image', 'video'] as const;

export const STATUSES = ['UNUSED', 'USED', 'DELETED'] as const;
