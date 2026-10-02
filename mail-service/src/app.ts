import { SERVICE_NAMES_MAP } from '@beautinique/backend-constants';
import { checkCors } from '@beautinique/backend-cors';
import { createHttpLogger } from '@beautinique/backend-logger';
import { errorResponse, notFoundResponse, successResponse } from '@beautinique/backend-response';
import express from 'express';
import path from 'path';
import { serve, setup } from 'swagger-ui-express';

import { logger, transporter, workerManager } from './configs/index.js';
import { LOGGER_BASE_OPTIONS, METHODS_AND_PATHS } from './constants/index.js';
import { openApiSpec } from './docs/openapi.js';
import { envs } from './envs/index.js';

const { health, home, wakeUp } = METHODS_AND_PATHS;

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
app[home.method](home.path, (_, res) => {
  res.sendFile(path.resolve('public', 'index.html'));
});

/**
 * Interactive API docs (OpenAPI/Swagger) - unauthenticated, same as `/`
 * and `/health`, so it stays reachable without a service secret.
 */
app.use('/docs', serve, setup(openApiSpec));

/**
 * CORS for ONLY the public `/health` + `/wake-up` routes (not the API router below) - lets the
 * frontend's boot-time wake-up ping read the response. Origins are the frontend `*_BASE_URL` envs.
 */
const publicRouteCors = checkCors({
  origin: [
    ...Object.values(envs.frontend_urls),
    'http://localhost:4173',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
  ],
  methods: ['GET'],
  optionsSuccessStatus: 204,
});

/**
 * Health endpoint.
 */
app[health.method](health.path, publicRouteCors, (_, res) => {
  res.success({
    message: 'Mail Service is healthy',
    data: {
      transporter: transporter.isConnected(),
      worker: workerManager.isRunning(),
      service: SERVICE_NAMES_MAP.mail,
    },
  });
});

/**
 * Service wake-up endpoint.
 */
app[wakeUp.method](wakeUp.path, publicRouteCors, (_, res) => {
  res.success({ message: 'Mail Service is awaked.' });
});

/* -------------------------------------------------------------------------- */
/*                              Error Handlers                                */
/* -------------------------------------------------------------------------- */

app.use(notFoundResponse({ serveHtml: true }));

app.use(errorResponse({ includeStack: envs.is_dev }));
