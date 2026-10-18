import { API_METHODS_MAP } from '@beautinique/backend-constants';

import { envs } from '../envs/index.js';
import type { TDashboardListProduct, TStorefrontProductSort } from '../types/index.js';

const { DELETE, GET, PATCH, POST } = API_METHODS_MAP;

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: GET, path: '/' },
  health: { method: GET, path: '/health' },
  wakeUp: { method: GET, path: '/wake-up' },
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
    // Admin review of a PENDING product - approve (-> PUBLISHED) or reject
    // (-> REJECTED, with a reason). Mirrors organization-service's
    // `seller.updateApprovalStatus` path shape.
    updateApprovalStatus: { method: PATCH, path: '/approval-status/:productId' },
    // "My Queue" - ?status=PENDING (default) & ?filter=mine|all|unassigned
    // (default `mine`; `all`/`unassigned` are MASTER-only).
    queue: { method: GET, path: '/queue' },
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

/* ================== STOREFRONT PRODUCT LISTING ================== */

export const STOREFRONT_PRODUCTS_LIMIT = { default: 12, max: 48 } as const;

export const STOREFRONT_MAX_BRANDS = 20;

export const STOREFRONT_MAX_COLORS = 6;

export const STOREFRONT_SEARCH_MAX_LENGTH = 100;

export const STOREFRONT_PRODUCT_SORTS = [
  'relevance',
  'newest',
  'price-asc',
  'price-desc',
  'popular',
  'rating',
  'discount',
] as const satisfies readonly TStorefrontProductSort[];

/** How each sort orders the listing. `relevance` only means something after a search (it falls back to `newest`). */
export const STOREFRONT_PRODUCT_SORT_STAGES: Record<
  Exclude<TStorefrontProductSort, 'relevance'>,
  Record<string, 1 | -1>
> = {
  newest: { createdAt: -1, _id: -1 },
  'price-asc': { sellingPrice: 1, _id: 1 },
  'price-desc': { sellingPrice: -1, _id: -1 },
  popular: { soldCount: -1, _id: -1 },
  rating: { averageRating: -1, totalReviews: -1, _id: -1 },
  discount: { discount: -1, _id: -1 },
};

/**
 * The fields of a product its own page reads (everything else - the seller, the history of the review, the status,
 * the product's own sku - stays in the service). The stock is read to be turned into words, and goes no further.
 */
export const PRODUCT_DETAILS_SELECT = [
  'title',
  'slug',
  'brand',
  'shortDescription',
  'description',
  'instructions',
  'ingredients',
  'additional',
  'originalPrice',
  'sellingPrice',
  'discount',
  'images',
  'thumbnail',
  'video',
  'category',
  'averageRating',
  'totalReviews',
  'soldCount',
  'stock',
  'stockThreshold',
  'hasVariants',
  'tryOn',
  'createdAt',
  'variants.sku',
  'variants.type',
  'variants.label',
  'variants.value',
  'variants.originalPrice',
  'variants.sellingPrice',
  'variants.discount',
  'variants.stock',
  'variants.stockThreshold',
  'variants.images',
  'variants.thumbnail',
].join(' ');

/** The fields of a product the cards of the storefront read; `images` is cut to the two the card can show. */
export const PRODUCT_STOREFRONT_PROJECTION = {
  title: 1,
  slug: 1,
  brand: 1,
  shortDescription: 1,
  thumbnail: 1,
  images: { $slice: ['$images', 2] },
  originalPrice: 1,
  sellingPrice: 1,
  discount: 1,
  averageRating: 1,
  totalReviews: 1,
  soldCount: 1,
  stock: 1,
  stockThreshold: 1,
  hasVariants: 1,
  tryOn: 1,
  createdAt: 1,
  'variants.type': 1,
  'variants.label': 1,
  'variants.value': 1,
  'variants.thumbnail': 1,
  'variants.stock': 1,
} as const;
