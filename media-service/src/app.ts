import { createHttpLogger } from '@beautinique/backend-logger';
import { checkDbConnection, getConnectionHealth } from '@beautinique/backend-mongoose';
import { checkServiceAccess } from '@beautinique/backend-request';
import { errorResponse, notFoundResponse, successResponse } from '@beautinique/backend-response';
import { HEADERS_MAP, SERVICE_NAMES_MAP } from '@beautinique/shared-constants';
import express from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { logger, workerManager } from './configs/index.js';
import { LOGGER_BASE_OPTIONS, METHODS_AND_PATHS } from './constants/index.js';
import { openApiSpec } from './docs/openapi.js';
import { envs } from './envs/index.js';
import { router } from './routes/index.js';

const { base, health, home } = METHODS_AND_PATHS;

/* -------------------------------------------------------------------------- */
/*                               Express App                                  */
/* -------------------------------------------------------------------------- */

export const app = express();

/* -------------------------------------------------------------------------- */
/*                                Middlewares                                 */
/* -------------------------------------------------------------------------- */

/**
 * Parses incoming JSON payloads.
 */
app.use(express.json({ limit: '10mb' }));

/**
 * Parses URL encoded form data.
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Serves static assets.
 */
app.use(express.static(path.resolve('public'), { index: false }));

/**
 * Logs every incoming request.
 */
app.use(createHttpLogger({ ...LOGGER_BASE_OPTIONS, logger }));

/**
 * Adds success response helpers.
 */
app.use(successResponse({ defaultMessage: 'Success.' }));

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/**
 * Serves the README, pre-rendered to HTML by `scripts/generate-html.mjs`
 * (runs automatically after `npm run build` via the "postbuild" script) -
 * avoids re-parsing markdown on every request.
 */
app[home.method](home.path, (_, res) => {
  res.sendFile(path.resolve('public', 'index.html'));
});

/**
 * Interactive API docs (OpenAPI/Swagger) - unauthenticated, same as `/`
 * and `/health`, so it stays reachable without a service secret.
 */
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

/**
 * Health endpoint.
 */
app[health.method](health.path, (_, res) => {
  res.success({
    message: 'Media Service is healthy',
    data: {
      database: getConnectionHealth(),
      service: SERVICE_NAMES_MAP['media-service'],
      worker: workerManager.isRunning(),
    },
  });
});

/**
 * API routes - requires a trusted service caller and a ready DB connection.
 *
 * `checkDbConnection` is scoped to this router (not global) so `/` and
 * `/health` above can still respond while MongoDB is unavailable.
 */
app.use(
  base,
  checkServiceAccess({ secret: envs.service_secret, headerName: HEADERS_MAP.serviceSecret }),
  checkDbConnection({ message: 'Database is unavailable' }),
  router,
);

/* -------------------------------------------------------------------------- */
/*                              Error Handlers                                */
/* -------------------------------------------------------------------------- */

app.use(notFoundResponse({ serveHtml: true }));

app.use(errorResponse({ includeStack: envs.is_dev }));
