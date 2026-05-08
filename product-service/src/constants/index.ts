import type { ConnectionOptions } from 'bullmq';
import { envs } from '../envs';

export const ORIGINS = Object.values(envs.url.frontend);

export const USER_STATUS = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const CATEGORY_LEVELS = [1, 2, 3] as const;

export const METHODS_AND_PATHS = {
  category: {
    base: '/category',
  },
} as const;

export const QUEUE_CONFIGS: ConnectionOptions = envs.redis.queue;

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
} as const;
