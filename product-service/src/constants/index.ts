import { ROLES, type TRole } from '@beautinique/be-constants';

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
      save: { method: METHOD_MAP.POST, path: '/' }, // For upload new Product as draft
      get: { method: METHOD_MAP.GET, path: '/' }, // For get existing draft Product
      remove: { method: METHOD_MAP.DELETE, path: '/' }, // For remove existing draft
      update: { method: METHOD_MAP.PATCH, path: '/' }, // For already published product and seller again made some changes
    },
  },
} as const;

export const PRODUCT_STATUS_MAP = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
} as const;

export const PRODUCT_STATUSES = Object.values(PRODUCT_STATUS_MAP);

export const VARIANT_STATUS_MAP = {
  PENDING: 'PENDING',
  USED: 'USED',
  UNUSED: 'UNUSED',
} as const;

export const VARIANT_STATUSES = Object.values(VARIANT_STATUS_MAP);

export const ROLES_MAP = Object.fromEntries(ROLES.map((role) => [role, role])) as Record<
  TRole,
  TRole
>;

export const TRY_ON_MAP = {
  LIP: ['MATTE', 'GLOSS', 'SHIMMER', 'CRAYON'],
  EYE: ['EYEBROW', 'EYELINER', 'KAJAL', 'EYESHADOW'],
  HAIR: ['COLOR'],
  FACE: ['CONCEALER', 'FOUNDATION', 'HIGHLIGHTER', 'BLUSH'],
  NAIL: ['GEL', 'LIQUID'],
  SKIN: ['MOISTURIZER', 'SERUM', 'TONER', 'CLEANSER'],
} as const;

export const TRY_ON_CATEGORIES = Object.keys(TRY_ON_MAP) as (keyof typeof TRY_ON_MAP)[];

export const HEADERS_KEYS = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
} as const;
