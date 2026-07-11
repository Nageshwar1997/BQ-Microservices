import { HEADERS_MAP } from '@beautinique/shared-constants';

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
    code: { type: 'string', example: 'VALIDATION_ERROR' },
    message: { type: 'string' },
    fieldErrors: { type: 'object', nullable: true },
    globalErrors: { type: 'array', items: { type: 'string' }, nullable: true },
  },
};

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: errorEnvelope } },
});

const authHeaderParams = [
  {
    name: HEADERS_MAP.serviceSecret,
    in: 'header',
    required: true,
    schema: { type: 'string' },
    description: 'Shared secret required on every /api/v1/* request (typically set by the API gateway).',
  },
  {
    name: HEADERS_MAP.userId,
    in: 'header',
    required: true,
    schema: { type: 'string' },
    description: "The authenticated end user's id, forwarded by the caller (no JWT here).",
  },
];

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Media Service API',
    version: '1.0.0',
    description:
      'Uploads media to Cloudinary and tracks its lifecycle (unused → used → deleted) in MongoDB via background BullMQ jobs. See the [README](/) for the full end-to-end flow.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [{ name: 'Upload', description: 'Media upload endpoints' }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness + MongoDB connection status',
        responses: {
          '200': {
            description: 'Service is up (database may still be down - check `data.database`).',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: {
                    database: { type: 'object' },
                    service: { type: 'string', example: 'media-service' },
                  },
                }),
              },
            },
          },
        },
      },
    },
    '/api/v1/upload/single': {
      post: {
        tags: ['Upload'],
        summary: 'Upload a single image or video',
        parameters: authHeaderParams,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'folder'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image (≤2MB) or video (≤10MB).',
                  },
                  folder: { type: 'string', description: 'Cloudinary subfolder, e.g. "products".' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Uploaded successfully.',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: { url: { type: 'string', format: 'uri' } },
                }),
              },
            },
          },
          '400': errorResponse('Missing/empty body or file, or failed validation.'),
          '401': errorResponse('Missing X-User-Id header.'),
          '403': errorResponse('Missing/invalid X-Service-Secret header.'),
          '413': errorResponse('File exceeds the allowed size for its type.'),
          '503': errorResponse('Database is unavailable.'),
        },
      },
    },
    '/api/v1/upload/multiple': {
      post: {
        tags: ['Upload'],
        summary: 'Upload several images/videos at once',
        parameters: authHeaderParams,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['files', 'folder'],
                properties: {
                  files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Any mix of images (≤2MB each) and videos (≤10MB each).',
                  },
                  folder: { type: 'string', description: 'Cloudinary subfolder, e.g. "products".' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description:
              'All files uploaded successfully (all-or-nothing - a single failure rolls back the rest).',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: {
                    urls: { type: 'array', items: { type: 'string', format: 'uri' } },
                  },
                }),
              },
            },
          },
          '400': errorResponse('Missing/empty body or files, or failed validation.'),
          '401': errorResponse('Missing X-User-Id header.'),
          '403': errorResponse('Missing/invalid X-Service-Secret header.'),
          '413': errorResponse('A file exceeds the allowed size for its type.'),
          '503': errorResponse('Database is unavailable.'),
        },
      },
    },
  },
};
