import { ROLES } from '@beautinique/be-constants';
import type { TDashboardProduct, TProduct, TSort, TTryOn, TTryOnKey } from '../types';

export const METHOD_MAP = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
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
    get: {
      dashboard: {
        base: '/dashboard',
        products: { method: METHOD_MAP.GET, path: '/products' },
        bySlug: { method: METHOD_MAP.GET, path: '/:slug' },
      },
      suggestions: { method: METHOD_MAP.GET, path: '/suggestions' },
      products: { method: METHOD_MAP.GET, path: '/products' },
      bySlug: { method: METHOD_MAP.GET, path: '/:slug' },
    },
  },
} as const;

export const PRODUCT_STATUSES = ['DELETED', 'PENDING', 'PUBLISHED', 'REJECTED', 'BLOCKED'] as const;

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

export const TRY_ON_CATEGORIES = Object.keys(TRY_ON_MAP) as TTryOnKey[];

export const TRY_ON_SUBCATEGORIES = Object.values(TRY_ON_MAP).flat() as TTryOn[TTryOnKey][number][];

export const HEADERS_KEYS = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
} as const;

export const SORT = ['asc', 'desc'] as const;

export const SORT_MAP = Object.fromEntries(SORT.map((sort) => [sort, sort])) as {
  [K in TSort]: K;
};

export type TProductFilter = Pick<TProduct, 'seller' | 'status' | 'category'>;

export const PRODUCT_DASHBOARD_PROJECTION: Record<
  keyof Omit<TDashboardProduct, 'variants'> | `${keyof Pick<TDashboardProduct, 'variants'>}.stock`,
  1
> = {
  title: 1,
  sku: 1,
  brand: 1,
  originalPrice: 1,
  sellingPrice: 1,
  stock: 1,
  slug: 1,
  thumbnail: 1,
  returnCount: 1,
  averageRating: 1,
  status: 1,
  tryOn: 1,
  soldCount: 1,
  hasVariants: 1,
  createdAt: 1,
  updatedAt: 1,
  'variants.stock': 1,
};

export const DRAFT_PRODUCT_STEP_MAP = {
  0: 'basicInfo',
  1: 'mediaAndGallery',
  2: 'descriptionAndContent',
  3: 'stockAndVariants',
  4: 'tryOnConfiguration',
} as const;

