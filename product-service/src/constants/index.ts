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

export const PRODUCT_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'] as const;

export const TRY_ON_CATEGORIES = ['LIP', 'EYE', 'HAIR', 'FACE', 'NAIL', 'SKIN'] as const;

export const TRY_ON_TYPES = {
  LIP: ['MATTE', 'GLOSS', 'SHIMMER', 'CRAYON'],
  EYE: ['EYEBROW', 'EYELINER', 'KAJAL', 'EYESHADOW'],
  HAIR: ['COLOR'],
  FACE: ['CONCEALER', 'FOUNDATION', 'HIGHLIGHTER', 'BLUSH'],
  NAIL: ['GEL', 'LIQUID'],
  SKIN: ['MOISTURIZER', 'SERUM', 'TONER', 'CLEANSER'],
} as const;
