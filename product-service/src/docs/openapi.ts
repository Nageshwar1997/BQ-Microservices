import {
  CATEGORY_LEVELS,
  CATEGORY_LEVELS_MAP,
  DRAFT_PRODUCT_STEP_MAP,
  HEADERS_MAP,
  PRODUCT_STATUSES,
  PRODUCT_STATUSES_MAP,
  SERVICE_NAMES_MAP,
  SORT,
  SORT_MAP,
  TRY_ON_ALL_SUB_CATEGORIES,
  TRY_ON_CATEGORIES,
  USER_ROLE_MAP,
  VARIANT_TYPES,
  VARIANT_TYPES_MAP,
} from '@beautinique/backend-constants';

import { METHODS_AND_PATHS } from '../constants/index.js';

const { health, category, product, base } = METHODS_AND_PATHS;

const successEnvelope = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema && { data: dataSchema }),
  },
});

const errorEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    code: { type: 'string', example: 'UNPROCESSABLE_ENTITY' },
    message: { type: 'string' },
    fieldErrors: {
      type: 'object',
      additionalProperties: { type: 'array', items: { type: 'string' } },
    },
    globalErrors: { type: 'array', items: { type: 'string' } },
  },
};

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: errorEnvelope } },
});

/* -------------------------------------------------------------------------- */
/*                              Reusable Schemas                              */
/* -------------------------------------------------------------------------- */

const categorySchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
    name: { type: 'string', example: 'Lipstick' },
    slug: { type: 'string', example: 'lipstick' },
    level: { type: 'integer', enum: CATEGORY_LEVELS, example: CATEGORY_LEVELS_MAP.L3 },
    parent: { type: 'string', description: 'Present for level 2 and 3 categories' },
    description: { type: 'string', description: 'Only meaningful for level 3 categories' },
  },
};

const categoryHierarchySchema = {
  ...categorySchema,
  properties: {
    ...categorySchema.properties,
    subcategories: { type: 'array', items: { type: 'object' }, description: 'Nested recursively' },
  },
};

const variantSchema = {
  type: 'object',
  required: ['sku', 'type', 'label', 'value', 'originalPrice', 'sellingPrice', 'stock'],
  properties: {
    _id: { type: 'string' },
    sku: { type: 'string', example: 'LIP-RED-001' },
    type: { type: 'string', enum: VARIANT_TYPES, example: VARIANT_TYPES_MAP.Color },
    label: { type: 'string', example: 'Ruby Red' },
    value: { type: 'string', example: '#B00020' },
    originalPrice: { type: 'number', minimum: 0 },
    sellingPrice: { type: 'number', minimum: 0 },
    discount: { type: 'number', minimum: 0, maximum: 100, description: 'Auto-calculated' },
    stock: { type: 'integer', minimum: 0 },
    stockThreshold: { type: 'integer', minimum: 0 },
    images: { type: 'array', items: { type: 'string', format: 'uri' } },
    thumbnail: { type: 'string', format: 'uri' },
  },
};

const tryOnSchema = {
  type: 'object',
  properties: {
    configured: { type: 'boolean' },
    enabled: { type: 'boolean' },
    category: {
      type: 'string',
      example: 'LIP',
      enum: TRY_ON_CATEGORIES,
      description: 'Only required when `enabled` is `true`',
    },
    subCategory: {
      type: 'string',
      example: 'MATTE',
      enum: TRY_ON_ALL_SUB_CATEGORIES,
      description: 'Only required when `enabled` is `true`',
    },
  },
};

const historySchema = {
  type: 'object',
  properties: {
    approvedBy: { type: 'string' },
    approvedAt: { type: 'string', format: 'date-time' },
    blockedBy: { type: 'string' },
    blockedAt: { type: 'string', format: 'date-time' },
    rejectedBy: { type: 'string' },
    rejectedAt: { type: 'string', format: 'date-time' },
    rejectReason: { type: 'string' },
  },
};

const productSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    sku: { type: 'string' },
    brand: { type: 'string' },
    originalPrice: { type: 'number' },
    sellingPrice: { type: 'number' },
    discount: { type: 'number' },
    stock: { type: 'integer', nullable: true },
    stockThreshold: { type: 'integer', nullable: true },
    shortDescription: { type: 'string' },
    description: { type: 'string' },
    instructions: { type: 'string' },
    ingredients: { type: 'string' },
    additional: { type: 'string' },
    slug: { type: 'string' },
    images: { type: 'array', items: { type: 'string', format: 'uri' } },
    thumbnail: { type: 'string', format: 'uri' },
    video: { type: 'string', format: 'uri' },
    category: { type: 'string', description: 'Category id (level 3)' },
    seller: { type: 'string' },
    soldCount: { type: 'integer' },
    returnCount: { type: 'integer' },
    totalReviews: { type: 'integer' },
    averageRating: { type: 'number', minimum: 0, maximum: 5 },
    hasVariants: { type: 'boolean' },
    variants: { type: 'array', items: variantSchema },
    status: { type: 'string', enum: PRODUCT_STATUSES },
    history: historySchema,
    tryOn: tryOnSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const dashboardListProductSchema = {
  type: 'object',
  properties: {
    title: productSchema.properties.title,
    sku: productSchema.properties.sku,
    brand: productSchema.properties.brand,
    originalPrice: productSchema.properties.originalPrice,
    sellingPrice: productSchema.properties.sellingPrice,
    stock: productSchema.properties.stock,
    slug: productSchema.properties.slug,
    thumbnail: productSchema.properties.thumbnail,
    returnCount: productSchema.properties.returnCount,
    averageRating: productSchema.properties.averageRating,
    status: productSchema.properties.status,
    tryOn: tryOnSchema,
    soldCount: productSchema.properties.soldCount,
    hasVariants: productSchema.properties.hasVariants,
    variants: {
      type: 'array',
      description:
        'Only the stock field is projected for the dashboard listing, not the full variant',
      items: {
        type: 'object',
        properties: { _id: { type: 'string' }, stock: { type: 'integer' } },
      },
    },
    createdAt: productSchema.properties.createdAt,
    updatedAt: productSchema.properties.updatedAt,
  },
};

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
};

const statusCountsSchema = {
  type: 'object',
  properties: {
    ALL: { type: 'integer' },
    [PRODUCT_STATUSES_MAP.DELETED]: { type: 'integer' },
    [PRODUCT_STATUSES_MAP.PENDING]: { type: 'integer' },
    [PRODUCT_STATUSES_MAP.PUBLISHED]: { type: 'integer' },
    [PRODUCT_STATUSES_MAP.REJECTED]: { type: 'integer' },
    [PRODUCT_STATUSES_MAP.BLOCKED]: { type: 'integer' },
  },
};

const basicInfoSchema = {
  type: 'object',
  description: '`step: "basicInfo"` — title/brand/pricing/category selection',
  required: [
    'step',
    'title',
    'brand',
    'originalPrice',
    'sellingPrice',
    'l1Category',
    'l2Category',
    'l3Category',
  ],
  properties: {
    step: { type: 'string', enum: [DRAFT_PRODUCT_STEP_MAP[0]] },
    title: { type: 'string', minLength: 2, maxLength: 200 },
    brand: { type: 'string', minLength: 2, maxLength: 100 },
    originalPrice: { type: 'number', exclusiveMinimum: 0 },
    sellingPrice: { type: 'number', minimum: 0 },
    l1Category: {
      type: 'object',
      properties: { _id: { type: 'string' }, name: { type: 'string' } },
    },
    l2Category: {
      type: 'object',
      properties: { _id: { type: 'string' }, name: { type: 'string' } },
    },
    l3Category: {
      type: 'object',
      properties: { _id: { type: 'string' }, name: { type: 'string' } },
    },
  },
};

const mediaAndGallerySchema = {
  type: 'object',
  description: '`step: "mediaAndGallery"` — thumbnail/gallery/video',
  required: ['step', 'thumbnail', 'images'],
  properties: {
    step: { type: 'string', enum: [DRAFT_PRODUCT_STEP_MAP[1]] },
    thumbnail: { type: 'string', format: 'uri' },
    images: { type: 'array', items: { type: 'string', format: 'uri' } },
    video: { type: 'string', format: 'uri' },
  },
};

const descriptionAndContentSchema = {
  type: 'object',
  description: '`step: "descriptionAndContent"` — long-form content fields',
  required: ['step', 'shortDescription', 'description'],
  properties: {
    step: { type: 'string', enum: [DRAFT_PRODUCT_STEP_MAP[2]] },
    shortDescription: { type: 'string', minLength: 10, maxLength: 300 },
    description: { type: 'string', minLength: 107 },
    instructions: { type: 'string', minLength: 20 },
    ingredients: { type: 'string', minLength: 20 },
    additional: { type: 'string', minLength: 20 },
  },
};

const stockAndVariantsSchema = {
  description: '`step: "stockAndVariants"` — discriminated on `hasVariants`',
  oneOf: [
    {
      type: 'object',
      required: ['step', 'hasVariants', 'stock', 'stockThreshold'],
      properties: {
        step: { type: 'string', enum: [DRAFT_PRODUCT_STEP_MAP[3]] },
        hasVariants: { type: 'boolean', enum: [false] },
        stock: { type: 'integer', minimum: 0 },
        stockThreshold: { type: 'integer', minimum: 0 },
      },
    },
    {
      type: 'object',
      required: ['step', 'hasVariants', 'variants'],
      properties: {
        step: { type: 'string', enum: [DRAFT_PRODUCT_STEP_MAP[3]] },
        hasVariants: { type: 'boolean', enum: [true] },
        variants: { type: 'array', minItems: 1, items: variantSchema },
      },
    },
  ],
};

const tryOnSelectionSchema = {
  type: 'object',
  required: ['category', 'subCategory'],
  properties: {
    category: tryOnSchema.properties.category,
    subCategory: tryOnSchema.properties.subCategory,
  },
};

const tryOnConfigurationSchema = {
  description:
    '`step: "tryOnConfiguration"` — discriminated on `enabled`. NOTE: as published, ' +
    '`@beautinique/backend-zod` declares `enabled: false` as the literal on *both* branches ' +
    'of this union (the branch requiring a full `tryOn` selection should be `enabled: true`) - ' +
    'documented here as originally intended, see README §25 for the caveat.',
  oneOf: [
    {
      type: 'object',
      required: ['step', 'enabled'],
      properties: {
        step: { type: 'string', enum: [DRAFT_PRODUCT_STEP_MAP[4]] },
        enabled: { type: 'boolean', enum: [false] },
        tryOn: tryOnSelectionSchema,
      },
    },
    {
      type: 'object',
      required: ['step', 'enabled', 'tryOn'],
      properties: {
        step: { type: 'string', enum: [DRAFT_PRODUCT_STEP_MAP[4]] },
        enabled: { type: 'boolean', enum: [true] },
        tryOn: tryOnSelectionSchema,
      },
    },
  ],
};

const draftProductStepBodySchema = {
  description:
    'One step of the multi-step draft, discriminated by the string `step` field. ' +
    'Exactly one of the following 5 shapes per request.',
  oneOf: [
    basicInfoSchema,
    mediaAndGallerySchema,
    descriptionAndContentSchema,
    ...stockAndVariantsSchema.oneOf,
    ...tryOnConfigurationSchema.oneOf,
  ],
};

const draftProductDetailsSchema = {
  type: 'object',
  description: 'The full, completed draft - every step must be present to publish.',
  required: [
    DRAFT_PRODUCT_STEP_MAP[0],
    DRAFT_PRODUCT_STEP_MAP[1],
    DRAFT_PRODUCT_STEP_MAP[2],
    DRAFT_PRODUCT_STEP_MAP[3],
    DRAFT_PRODUCT_STEP_MAP[4],
  ],
  properties: {
    basicInfo: basicInfoSchema,
    mediaAndGallery: mediaAndGallerySchema,
    descriptionAndContent: descriptionAndContentSchema,
    stockAndVariants: stockAndVariantsSchema,
    tryOnConfiguration: tryOnConfigurationSchema,
  },
};

const createCategoryBodySchema = {
  type: 'object',
  required: ['name', 'level'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 120 },
    level: { type: 'integer', enum: CATEGORY_LEVELS },
    parent: {
      type: 'string',
      description: 'Required for level 2 and 3, must be one level shallower',
    },
    description: { type: 'string', minLength: 10, maxLength: 150, description: 'Level 3 only' },
  },
};

const updateCategoryBodySchema = {
  type: 'object',
  required: ['level'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 120 },
    level: {
      type: 'integer',
      enum: CATEGORY_LEVELS,
      description: 'Must match the existing category - immutable',
    },
    parent: {
      type: 'string',
      nullable: true,
      description: 'Only touched when this key is present in the request body at all',
    },
    description: { type: 'string', minLength: 10, maxLength: 150, description: 'Level 3 only' },
  },
};

/* -------------------------------------------------------------------------- */
/*                              Path Parameters                               */
/* -------------------------------------------------------------------------- */

const categoryIdParam = {
  name: 'categoryId',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

const slugParam = {
  name: 'slug',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Product Service API',
    version: '1.0.0',
    description:
      'Product catalog and category service for Beautinique: a multi-step draft → review → publish flow ' +
      'for seller-submitted products, a 3-level category hierarchy (L1/L2/L3), a searchable/paginated ' +
      'seller & admin dashboard, public product lookup, and Atlas Search-powered autocomplete suggestions. ' +
      'See the [README](/) for the full flow diagrams and error code reference.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Category', description: 'Category tree management (L1/L2/L3)' },
    { name: 'Draft Product', description: 'Multi-step draft product save/publish flow' },
    { name: 'Dashboard Product', description: 'Seller/admin product listing and lookup' },
    { name: 'Public Product', description: 'Storefront product lookup and search suggestions' },
  ],
  components: {
    securitySchemes: {
      serviceSecret: {
        type: 'apiKey',
        in: 'header',
        name: HEADERS_MAP.serviceSecret,
        description: `Shared secret required on every ${base}/* request (typically set by the API gateway).`,
      },
      userId: {
        type: 'apiKey',
        in: 'header',
        name: HEADERS_MAP.userId,
        description: "The authenticated end user's id, forwarded by the caller (no JWT here).",
      },
      userRole: {
        type: 'apiKey',
        in: 'header',
        name: HEADERS_MAP.userRole,
        description: "The authenticated end user's role. Defaults to USER if not sent.",
      },
    },
  },
  security: [{ serviceSecret: [] }],
  paths: {
    [health.path]: {
      [health.method]: {
        tags: ['Health'],
        summary: 'Liveness + MongoDB connection status',
        security: [],
        responses: {
          '200': {
            description: 'Service is up (database may still be down - check `data.database`).',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: {
                    database: { type: 'object' },
                    service: { type: 'string', example: SERVICE_NAMES_MAP['product-service'] },
                  },
                }),
              },
            },
          },
        },
      },
    },

    [`${base}${category.base}`]: {
      [category.add.method]: {
        tags: ['Category'],
        summary: 'Create a category',
        description: 'Requires ADMIN or MASTER role.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: createCategoryBodySchema } },
        },
        responses: {
          '201': {
            description: 'Category created.',
            content: { 'application/json': { schema: successEnvelope() } },
          },
          '404': errorResponse('Parent category not found.'),
          '409': errorResponse('A sibling with the same slug already exists.'),
          '422': errorResponse('Invalid parent category for the given level.'),
        },
      },
    },

    // [`${base}${category.base}${category.delete.path.replace(':', '{')}}`]: {
    [`${base}${category.base}${category.update.path.replace(':', '{')}}`]: {
      [category.update.method]: {
        tags: ['Category'],
        summary: 'Update a category',
        description: 'Requires ADMIN or MASTER role. `level` is immutable.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [categoryIdParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: updateCategoryBodySchema } },
        },
        responses: {
          '200': {
            description: 'Category updated.',
            content: { 'application/json': { schema: successEnvelope() } },
          },
          '404': errorResponse('Category or parent category not found.'),
          '409': errorResponse('Duplicate slug, self-parenting, or a level change was attempted.'),
          '422': errorResponse('Invalid parent category for the given level.'),
        },
      },
      [category.delete.method]: {
        tags: ['Category'],
        summary: 'Delete a category',
        description:
          'Requires ADMIN or MASTER role. Only a leaf category with zero products can be deleted.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [categoryIdParam],
        responses: {
          '200': {
            description: 'Category deleted.',
            content: { 'application/json': { schema: successEnvelope() } },
          },
          '404': errorResponse('Category not found.'),
          '422': errorResponse(
            'Category has child categories or (for level 3) still has products.',
          ),
        },
      },
    },

    [`${base}${category.base}${category.get.byParentLevel.path}`]: {
      [category.get.byParentLevel.method]: {
        tags: ['Category'],
        summary: 'List categories by parent + level',
        description:
          'Requires ADMIN, MASTER, or SELLER role. Reads from the Redis cache-aside category list.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [
          { name: 'level', in: 'query', schema: { type: 'integer', enum: CATEGORY_LEVELS } },
          {
            name: 'parent',
            in: 'query',
            schema: { type: 'string' },
            description: 'Required for level 2/3',
          },
        ],
        responses: {
          '200': {
            description: 'Matching categories.',
            content: {
              'application/json': {
                schema: successEnvelope({ type: 'array', items: categorySchema }),
              },
            },
          },
        },
      },
    },

    [`${base}${category.base}${category.get.byHierarchy.path}`]: {
      [category.get.byHierarchy.method]: {
        tags: ['Category'],
        summary: 'Full L1 -> L2 -> L3 category tree',
        security: [{ serviceSecret: [] }],
        responses: {
          '200': {
            description: 'Nested category hierarchy, rooted at level 1.',
            content: {
              'application/json': {
                schema: successEnvelope({ type: 'array', items: categoryHierarchySchema }),
              },
            },
          },
        },
      },
    },

    [`${base}${product.base}${product.draft.base}`]: {
      [product.draft.save.method]: {
        tags: ['Draft Product'],
        summary: 'Save one step of a multi-step draft',
        description: `Requires ${USER_ROLE_MAP.ADMIN}, ${USER_ROLE_MAP.SELLER}, or ${USER_ROLE_MAP.MASTER} role. Accumulates into a per-user Redis hash (24h TTL).`,
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: draftProductStepBodySchema } },
        },
        responses: {
          '201': {
            description: 'Step saved; returns the accumulated draft so far.',
            content: {
              'application/json': { schema: successEnvelope(draftProductDetailsSchema) },
            },
          },
        },
      },
      [product.draft.get.method]: {
        tags: ['Draft Product'],
        summary: "Fetch the caller's in-progress draft",
        description: 'Requires ADMIN, SELLER, or MASTER role.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        responses: {
          '200': {
            description: 'The current draft, or null fields if nothing has been saved yet.',
            content: {
              'application/json': { schema: successEnvelope(draftProductDetailsSchema) },
            },
          },
        },
      },
    },

    [`${base}${product.base}${product.draft.base}${product.draft.publish.path}`]: {
      [product.draft.publish.method]: {
        tags: ['Draft Product'],
        summary: 'Publish a completed draft as a real product',
        description:
          'Requires ADMIN, SELLER, or MASTER role. The full draft is loaded from Redis and used as the ' +
          'request body (client does not send a body). Status is PUBLISHED directly for ADMIN/MASTER, ' +
          'or PENDING (awaiting approval) for SELLER.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        responses: {
          '201': {
            description: 'Product created.',
            content: { 'application/json': { schema: successEnvelope(productSchema) } },
          },
          '404': errorResponse('Draft expired or was never started.'),
          '422': errorResponse(
            'Validation failed for the assembled product (price, variants, try-on, ...).',
          ),
        },
      },
    },

    [`${base}${product.base}${product.get.dashboard.base}${product.get.dashboard.products.path}`]: {
      [product.get.dashboard.products.method]: {
        tags: ['Dashboard Product'],
        summary: 'Paginated/sortable/searchable product listing',
        description:
          `Requires ${USER_ROLE_MAP.ADMIN}, ${USER_ROLE_MAP.SELLER}, or ${USER_ROLE_MAP.MASTER} role. Sellers only see their own products. ` +
          'Uses Atlas Search when `search` is provided, a plain Mongo query otherwise.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: PRODUCT_STATUSES } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'createdAt',
                'updatedAt',
                'title',
                'sellingPrice',
                'originalPrice',
                'soldCount',
              ],
              default: 'createdAt',
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: SORT, default: SORT_MAP.desc },
          },
        ],
        responses: {
          '200': {
            description: 'A page of products, plus pagination info and a status-count summary.',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: {
                    products: { type: 'array', items: dashboardListProductSchema },
                    pagination: paginationSchema,
                    counts: statusCountsSchema,
                  },
                }),
              },
            },
          },
        },
      },
    },

    [`${base}${product.base}${product.get.dashboard.bySlug.path.replace(':', '{')}}`]: {
      [product.get.dashboard.bySlug.method]: {
        tags: ['Dashboard Product'],
        summary: 'Single product lookup for the dashboard',
        description: `Requires ${USER_ROLE_MAP.ADMIN}, ${USER_ROLE_MAP.SELLER}, or ${USER_ROLE_MAP.MASTER} role. Cache-aside over Redis (1-day TTL).`,
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [slugParam],
        responses: {
          '200': {
            description: 'The product (excluding variant stockThreshold).',
            content: { 'application/json': { schema: successEnvelope(productSchema) } },
          },
          '404': errorResponse('Product not found or not published.'),
        },
      },
    },

    [`${base}${product.base}${product.get.bySlug.path.replace(':', '{')}}`]: {
      [product.get.bySlug.method]: {
        tags: ['Public Product'],
        summary: 'Public storefront product lookup',
        description:
          'Only ever returns PUBLISHED products. No authentication headers required beyond the service secret.',
        security: [{ serviceSecret: [] }],
        parameters: [slugParam],
        responses: {
          '200': {
            description: 'The published product, with its category name populated.',
            content: { 'application/json': { schema: successEnvelope(productSchema) } },
          },
        },
      },
    },

    [`${base}${product.base}${product.get.suggestions.path}`]: {
      [product.get.suggestions.method]: {
        tags: ['Public Product'],
        summary: 'Autocomplete search suggestions',
        description:
          'Atlas Search across title (must-match), brand/slug/shortDescription (should-match). Max 5 results.',
        security: [{ serviceSecret: [] }],
        parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Up to 5 matching published products.',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      title: { type: 'string' },
                      slug: { type: 'string' },
                      thumbnail: { type: 'string', format: 'uri' },
                      brand: { type: 'string' },
                    },
                  },
                }),
              },
            },
          },
        },
      },
    },
  },
};
