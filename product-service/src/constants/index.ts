import { ROLES } from '@beautinique/be-constants';
import type { TTryOn, TTryOnKey } from '../types';

export const USER_STATUS = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const METHOD_MAP = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: METHOD_MAP.GET, path: '/' },
  health: { method: METHOD_MAP.GET, path: '/health' },
  category: {
    base: '/category',
    add: { method: METHOD_MAP.POST, path: '/' },
    update: { method: METHOD_MAP.PATCH, path: '/:categoryId' },
    delete: { method: METHOD_MAP.DELETE, path: '/:categoryId' },
    get: {
      byParentLevel: { method: METHOD_MAP.GET, path: '/by-parent-level' },
      byHierarchy: { method: METHOD_MAP.GET, path: '/by-hierarchy' },
    },
  },
  product: {
    base: '/product',
    draft: {
      base: '/draft',
      publish: { method: METHOD_MAP.PATCH, path: '/publish' }, // For publish existing draft
      save: { method: METHOD_MAP.POST, path: '/' }, // For upload new Product as draft
      get: { method: METHOD_MAP.GET, path: '/' }, // For get existing draft Product
      remove: { method: METHOD_MAP.DELETE, path: '/' }, // For remove existing draft
      update: { method: METHOD_MAP.PATCH, path: '/' }, // For already published product and seller again made some changes
    },
    publish: { method: METHOD_MAP.PATCH, path: '/publish' }, // For publish existing Product
  },
} as const;

export const PRODUCT_STATUSES = ['DELETED', 'PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'] as const;

export const PRODUCT_STATUS_MAP = Object.fromEntries(
  PRODUCT_STATUSES.map((status) => [status, status]),
) as {
  [K in (typeof PRODUCT_STATUSES)[number]]: K;
};

export const ROLES_MAP = Object.fromEntries(ROLES.map((role) => [role, role])) as {
  [K in (typeof ROLES)[number]]: K;
};

export const TRY_ON_MAP = {
  LIP: ['MATTE', 'GLOSS', 'SHIMMER', 'CRAYON'],
  EYE: ['EYEBROW', 'EYELINER', 'KAJAL', 'EYESHADOW'],
  HAIR: ['COLOR'],
  FACE: ['CONCEALER', 'FOUNDATION', 'HIGHLIGHTER', 'BLUSH'],
  NAIL: ['GEL', 'LIQUID'],
  SKIN: ['MOISTURIZER', 'SERUM', 'TONER', 'CLEANSER'],
} as const;

export const TRY_ON_CATEGORIES = Object.keys(TRY_ON_MAP) as (TTryOnKey)[];

export const TRY_ON_SUBCATEGORIES = Object.values(TRY_ON_MAP).flat() as TTryOn[TTryOnKey][number][];

export const HEADERS_KEYS = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
} as const;
