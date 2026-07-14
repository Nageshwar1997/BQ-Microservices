import { SERVICE_NAMES_MAP } from '@beautinique/shared-constants';

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
    title: 'Mail Service API',
    version: '1.0.0',
    description:
      'Sends transactional emails (currently OTP verification codes) over SMTP. ' +
      'Has no public send endpoints - work is consumed from the `mail-queue` BullMQ ' +
      'queue (job `send-otp`), enqueued by other services such as user-service. ' +
      'See the [README](/) for more details.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [{ name: 'Health', description: 'Service health check' }],
  paths: {
    [health.path]: {
      [health.method]: {
        tags: ['Health'],
        summary: 'Liveness + dependency connection status',
        responses: {
          '200': {
            description: 'Service is up (dependencies may still be down - check `data`).',
            content: {
              'application/json': {
                schema: successEnvelope({
                  type: 'object',
                  properties: {
                    mail: { type: 'boolean', description: 'SMTP transporter is connected.' },
                    worker: { type: 'boolean', description: 'BullMQ worker is running.' },
                    service: { type: 'string', example: SERVICE_NAMES_MAP['mail-service'] },
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
