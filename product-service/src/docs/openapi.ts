import { HEADERS_MAP } from '@beautinique/shared-constants';

import { METHODS_AND_PATHS } from '../constants/index.js';

const { health, category, product } = METHODS_AND_PATHS;

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
    fieldErrors: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
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
    level: { type: 'integer', enum: [1, 2, 3], example: 3 },
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
    type: { type: 'string', enum: ['Color', 'Text'] },
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
    category: { type: 'string', example: 'LIP', enum: ['LIP', 'EYE', 'HAIR', 'FACE', 'NAIL', 'SKIN'] },
    subCategory: { type: 'string', example: 'MATTE' },
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
    status: {
      type: 'string',
      enum: ['DELETED', 'PENDING', 'PUBLISHED', 'REJECTED', 'BLOCKED'],
    },
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
      description: 'Only the stock field is projected for the dashboard listing, not the full variant',
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
    DELETED: { type: 'integer' },
    PENDING: { type: 'integer' },
    PUBLISHED: { type: 'integer' },
    REJECTED: { type: 'integer' },
    BLOCKED: { type: 'integer' },
  },
};

const basicInfoSchema = {
  type: 'object',
  required: [
    'title',
    'brand',
    'originalPrice',
    'sellingPrice',
    'l1Category',
    'l2Category',
    'l3Category',
  ],
  properties: {
    title: { type: 'string', minLength: 2, maxLength: 200 },
    brand: { type: 'string', minLength: 2, maxLength: 100 },
    originalPrice: { type: 'number', exclusiveMinimum: 0 },
    sellingPrice: { type: 'number', minimum: 0 },
    l1Category: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' } } },
    l2Category: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' } } },
    l3Category: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' } } },
  },
};

const mediaAndGallerySchema = {
  type: 'object',
  required: ['thumbnail', 'images'],
  properties: {
    thumbnail: { type: 'string', format: 'uri' },
    images: { type: 'array', items: { type: 'string', format: 'uri' } },
    video: { type: 'string', format: 'uri' },
  },
};

const descriptionAndContentSchema = {
  type: 'object',
  required: ['shortDescription', 'description'],
  properties: {
    shortDescription: { type: 'string', minLength: 10, maxLength: 300 },
    description: { type: 'string', minLength: 107 },
    instructions: { type: 'string', minLength: 20 },
    ingredients: { type: 'string', minLength: 20 },
    additional: { type: 'string', minLength: 20 },
  },
};

const stockAndVariantsSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['hasVariants', 'stock', 'stockThreshold'],
      properties: {
        hasVariants: { type: 'boolean', enum: [false] },
        stock: { type: 'integer', minimum: 0 },
        stockThreshold: { type: 'integer', minimum: 0 },
      },
    },
    {
      type: 'object',
      required: ['hasVariants', 'variants'],
      properties: {
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
  oneOf: [
    {
      type: 'object',
      required: ['enabled'],
      properties: { enabled: { type: 'boolean', enum: [false] } },
    },
    {
      type: 'object',
      required: ['enabled', 'tryOn'],
      properties: {
        enabled: { type: 'boolean', enum: [true] },
        tryOn: tryOnSelectionSchema,
      },
    },
  ],
};

const draftProductStepBodySchema = {
  type: 'object',
  description: 'One step of the multi-step draft. `step` selects which of the fields below is required.',
  required: ['step'],
  properties: {
    step: { type: 'integer', enum: [0, 1, 2, 3, 4] },
    ...basicInfoSchema.properties,
    ...mediaAndGallerySchema.properties,
    ...descriptionAndContentSchema.properties,
    hasVariants: { type: 'boolean' },
    stock: { type: 'integer' },
    stockThreshold: { type: 'integer' },
    variants: { type: 'array', items: variantSchema },
    enabled: { type: 'boolean' },
    tryOn: tryOnSelectionSchema,
  },
};

const draftProductDetailsSchema = {
  type: 'object',
  description: 'The full, completed draft - every step must be present to publish.',
  required: [
    'basicInfo',
    'mediaAndGallery',
    'descriptionAndContent',
    'stockAndVariants',
    'tryOnConfiguration',
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
    level: { type: 'integer', enum: [1, 2, 3] },
    parent: { type: 'string', description: 'Required for level 2 and 3, must be one level shallower' },
    description: { type: 'string', minLength: 10, maxLength: 150, description: 'Level 3 only' },
  },
};

const updateCategoryBodySchema = {
  type: 'object',
  required: ['level'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 120 },
    level: { type: 'integer', enum: [1, 2, 3], description: 'Must match the existing category - immutable' },
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
        description:
          'Shared secret required on every /api/v1/* request (typically set by the API gateway).',
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
                    service: { type: 'string', example: 'product-service' },
                  },
                }),
              },
            },
          },
        },
      },
    },

    '/api/v1/category': {
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

    '/api/v1/category/{categoryId}': {
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
        description: 'Requires ADMIN or MASTER role. Only a leaf category with zero products can be deleted.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [categoryIdParam],
        responses: {
          '200': {
            description: 'Category deleted.',
            content: { 'application/json': { schema: successEnvelope() } },
          },
          '404': errorResponse('Category not found.'),
          '422': errorResponse('Category has child categories or (for level 3) still has products.'),
        },
      },
    },

    '/api/v1/category/by-parent-level': {
      [category.get.byParentLevel.method]: {
        tags: ['Category'],
        summary: 'List categories by parent + level',
        description: 'Requires ADMIN, MASTER, or SELLER role. Reads from the Redis cache-aside category list.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [
          { name: 'level', in: 'query', schema: { type: 'integer', enum: [1, 2, 3] } },
          { name: 'parent', in: 'query', schema: { type: 'string' }, description: 'Required for level 2/3' },
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

    '/api/v1/category/by-hierarchy': {
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

    '/api/v1/product/draft': {
      [product.draft.save.method]: {
        tags: ['Draft Product'],
        summary: 'Save one step of a multi-step draft',
        description: 'Requires ADMIN, SELLER, or MASTER role. Accumulates into a per-user Redis hash (24h TTL).',
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

    '/api/v1/product/draft/publish': {
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
          '422': errorResponse('Validation failed for the assembled product (price, variants, try-on, ...).'),
        },
      },
    },

    '/api/v1/product/dashboard/products': {
      [product.get.dashboard.products.method]: {
        tags: ['Dashboard Product'],
        summary: 'Paginated/sortable/searchable product listing',
        description:
          'Requires ADMIN, SELLER, or MASTER role. Sellers only see their own products. ' +
          'Uses Atlas Search when `search` is provided, a plain Mongo query otherwise.',
        security: [{ serviceSecret: [] }, { userId: [] }, { userRole: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['DELETED', 'PENDING', 'PUBLISHED', 'REJECTED', 'BLOCKED'] },
          },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['createdAt', 'updatedAt', 'title', 'sellingPrice', 'originalPrice', 'soldCount'],
              default: 'createdAt',
            },
          },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
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

    '/api/v1/product/dashboard/{slug}': {
      [product.get.dashboard.bySlug.method]: {
        tags: ['Dashboard Product'],
        summary: 'Single product lookup for the dashboard',
        description: 'Requires ADMIN, SELLER, or MASTER role. Cache-aside over Redis (1-day TTL).',
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

    '/api/v1/product/{slug}': {
      [product.get.bySlug.method]: {
        tags: ['Public Product'],
        summary: 'Public storefront product lookup',
        description: 'Only ever returns PUBLISHED products. No authentication headers required beyond the service secret.',
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

    '/api/v1/product/suggestions': {
      [product.get.suggestions.method]: {
        tags: ['Public Product'],
        summary: 'Autocomplete search suggestions',
        description: 'Atlas Search across title (must-match), brand/slug/shortDescription (should-match). Max 5 results.',
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
