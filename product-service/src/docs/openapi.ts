import { HEADERS_MAP } from '@beautinique/shared-constants';

import { METHODS_AND_PATHS } from '../constants/index.js';

const { health } = METHODS_AND_PATHS;

const successEnvelope = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema && { data: dataSchema }),
  },
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Product Service API',
    version: '1.0.0',
    description:
      'Identity and authentication service for Beautinique: manual + OAuth (Google/LinkedIn/GitHub) login, ' +
      'OTP-verified registration and password reset, session lookup, and a Redis-backed user/session cache. ' +
      'See the [README](/) for the full flow diagrams and error code reference.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Login', description: 'Manual and OAuth login' },
    { name: 'Register', description: 'OTP-based registration' },
    { name: 'Password', description: 'Forgot / change / set password' },
    { name: 'Logout', description: 'Session invalidation' },
    { name: 'Product', description: 'Current session lookup' },
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
                    service: { type: 'string', example: 'user-service' },
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
