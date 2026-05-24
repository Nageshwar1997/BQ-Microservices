import { ROLES, type TRole } from '@beautinique/be-constants';

export const USER_STATUS = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

const BASE = '/api/v1/product-service' as const;
export const METHODS_AND_PATHS = {
  base: BASE,
  home: { method: 'get', path: '/' },
  health: { method: 'get', path: '/health' },
  category: {
    base: '/category',
    add: { method: 'post', path: '/add' },
    update: { method: 'patch', path: '/update/:categoryId' },
    delete: { method: 'delete', path: '/delete/:categoryId' },
    get: {
      byParentLevel: { method: 'get', path: '/by-parent-level' },
      byHierarchy: { method: 'get', path: '/by-hierarchy' },
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

export const TRY_ON_CATEGORIES = ['LIP', 'EYE', 'HAIR', 'FACE', 'NAIL', 'SKIN'] as const;

export const TRY_ON_MAP = {
  LIP: ['MATTE', 'GLOSS', 'SHIMMER', 'CRAYON'],
  EYE: ['EYEBROW', 'EYELINER', 'KAJAL', 'EYESHADOW'],
  HAIR: ['COLOR'],
  FACE: ['CONCEALER', 'FOUNDATION', 'HIGHLIGHTER', 'BLUSH'],
  NAIL: ['GEL', 'LIQUID'],
  SKIN: ['MOISTURIZER', 'SERUM', 'TONER', 'CLEANSER'],
} as const;

export const HEADERS_KEYS = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
} as const;
