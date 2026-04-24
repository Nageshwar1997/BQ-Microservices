import { envs } from '@/envs';
import type { TResourceType, TStatus } from '@/types';
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
  mark_as_unused: {
    base: '/mark-as-unused',
    single: { method: 'post', path: '/single' },
    multiple: { method: 'post', path: '/multiple' },
  },
  mark_as_used: {
    base: '/mark-as-used',
    single: { method: 'patch', path: '/single' },
    multiple: { method: 'patch', path: '/multiple' },
  },
  mark_as_deleted: {
    base: '/mark-as-deleted',
    single: { method: 'delete', path: '/single' },
    multiple: { method: 'delete', path: '/multiple' },
  },
  get_non_deleted: {
    base: '/get-non-deleted',
    single: { method: 'get', path: '/single' },
    multiple: { method: 'get', path: '/multiple' },
  },
  cloudinary_upload: {
    base: '/cloudinary-upload',
    single: { method: 'post', path: '/single' },
    multiple: { method: 'post', path: '/multiple' },
  },
  cloudinary_remove: {
    base: '/cloudinary-remove',
    single: { method: 'delete', path: '/single' },
    multiple: { method: 'delete', path: '/multiple' },
  },
} as const;

export const QUEUE_CONFIGS: ConnectionOptions = envs.redis.queue;

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
    'mark-as-used-single-media',
    'mark-as-deleted-multiple-media',
    'mark-as-deleted-multiple-media',
  ],
} as const;

export const SERVICES = ['user-service'] as const;

export const RESOURCES = ['image', 'video'] as const;

export const STATUSES = ['UNUSED', 'USED', 'DELETED'] as const;
export const STATUS_MAP = Object.fromEntries(STATUSES.map((status) => [status, status])) as Record<
  TStatus,
  TStatus
>;
