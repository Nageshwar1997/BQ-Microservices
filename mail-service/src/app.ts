import { createHttpLogger } from '@beautinique/backend-logger';
import { errorResponse, notFoundResponse, successResponse } from '@beautinique/backend-response';
import express from 'express';
import path from 'path';
import { serve, setup } from 'swagger-ui-express';

import { logger } from './configs/index.js';
import { LOGGER_BASE_OPTIONS } from './constants/index.js';
import { openApiSpec } from './docs/openapi.js';
import { envs } from './envs/index.js';

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
 * Serves the README, pre-rendered to HTML at build time by
 * `scripts/generate-readme.js` (see the "build"/"predev" scripts) -
 * avoids re-parsing markdown on every request.
 */
app.get('/', (_, res) => {
  res.sendFile(path.resolve('public', 'index.html'));
});

/**
 * Interactive API docs (OpenAPI/Swagger) - unauthenticated, same as `/`
 * and `/health`, so it stays reachable without a service secret.
 */
app.use('/docs', serve, setup(openApiSpec));

/**
 * Health endpoint.
 */
app.get('/health', (_, res) => {
  res.success({
    message: 'Mail Service is healthy',
  });
});

/* -------------------------------------------------------------------------- */
/*                              Error Handlers                                */
/* -------------------------------------------------------------------------- */

app.use(notFoundResponse({ serveHtml: true }));

app.use(errorResponse({ includeStack: envs.is_dev }));
