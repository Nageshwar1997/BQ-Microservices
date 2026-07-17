import { API_METHODS_MAP } from '@beautinique/shared-constants';

import { envs } from '../envs/index.js';
import type { TDashboardListProduct } from '../types/index.js';

const { DELETE, GET, PATCH, POST } = API_METHODS_MAP;

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: GET, path: '/' },
  health: { method: GET, path: '/health' },
  category: {
    base: '/category',
    add: { method: POST, path: '/' },
    update: { method: PATCH, path: '/:categoryId' },
    delete: { method: DELETE, path: '/:categoryId' },
    get: {
      byParentLevel: { method: GET, path: '/by-parent-level' },
      byHierarchy: { method: GET, path: '/by-hierarchy' },
    },
  },
  product: {
    base: '/product',
    draft: {
      base: '/draft',
      publish: { method: PATCH, path: '/publish' }, // For publish existing draft
      save: { method: POST, path: '/' }, // For upload new Product as draft
      get: { method: GET, path: '/' }, // For get existing draft Product
      remove: { method: DELETE, path: '/' }, // For remove existing draft
      update: { method: PATCH, path: '/' }, // For already published product and seller again made some changes
    },
    publish: { method: PATCH, path: '/publish' }, // For publish existing Product
    get: {
      dashboard: {
        base: '/dashboard',
        products: { method: GET, path: '/products' },
        bySlug: { method: GET, path: '/:slug' },
      },
      suggestions: { method: GET, path: '/suggestions' },
      products: { method: GET, path: '/products' },
      bySlug: { method: GET, path: '/:slug' },
    },
  },
} as const;

export const PRODUCT_DASHBOARD_PROJECTION: Record<
  | keyof Omit<TDashboardListProduct, 'variants'>
  | `${keyof Pick<TDashboardListProduct, 'variants'>}.stock`,
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
