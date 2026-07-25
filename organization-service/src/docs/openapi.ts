import { HEADERS_MAP, SERVICE_NAMES_MAP } from '@beautinique/shared-constants';

import { METHODS_AND_PATHS } from '../constants/index.js';

const { base, health } = METHODS_AND_PATHS;

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
    title: 'Organization Service API',
    version: '1.0.0',
    description:
      'Identity and authentication service for Beautinique: manual + OAuth (Google/LinkedIn/GitHub) login, ' +
      'OTP-verified registration and password reset, session lookup, and a Redis-backed organization cache. ' +
      'See the [README](/) for the full flow diagrams and error code reference.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [{ name: 'Health', description: 'Service health check' }],
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
                    service: { type: 'string', example: SERVICE_NAMES_MAP['user-service'] },
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
