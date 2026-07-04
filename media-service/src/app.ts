import { connectionState, getConnectionHealth } from '@beautinique/backend-mongoose';
import {
  checkDbConnection,
  errorResponse,
  notFoundResponse,
  serviceAccess,
  setRequestId,
  successResponse,
} from '@beautinique/be-middlewares';
import { HEADERS_MAP } from '@beautinique/shared-constants';
import express from 'express';
import path from 'path';

import { errorLogs, requestLogs } from './configs/index.js';
import { METHODS_AND_PATHS } from './constants/index.js';
import { envs } from './envs/index.js';
import { router } from './routes/index.js';

const { base } = METHODS_AND_PATHS;

/* -------------------------------------------------------------------------- */
/*                               Express App                                  */
/* -------------------------------------------------------------------------- */

export const app = express();

/* -------------------------------------------------------------------------- */
/*                                Middlewares                                 */
/* -------------------------------------------------------------------------- */

/**
 * Adds a unique request id to every incoming request.
 */
app.use(setRequestId);

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
app.use(express.static(path.resolve('public')));

/**
 * Logs every incoming request.
 */
app.use(requestLogs);

/**
 * Adds success response helpers.
 */
app.use(successResponse);

/**
 * Rejects requests while MongoDB is unavailable.
 */
app.use(checkDbConnection(connectionState.isConnected));

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/**
 * Root endpoint.
 */
app.get('/', (_, res) => {
  res.success(200, 'Welcome to the Media Service API');
});

/**
 * Health endpoint.
 */
app.get('/health', (_, res) => {
  res.success(200, 'Media Service is healthy', {
    database: getConnectionHealth(),
    connected: connectionState.isConnected(),
  });
});

/**
 * Protected API routes.
 */
app.use(
  base,
  serviceAccess({
    secret: envs.service_secret,
    headerName: HEADERS_MAP.serviceSecret,
  }),
  router,
);

/* -------------------------------------------------------------------------- */
/*                              Error Handlers                                */
/* -------------------------------------------------------------------------- */

app.use(notFoundResponse);

app.use(errorLogs);

app.use(
  errorResponse({
    isDev: envs.is_dev,
  }),
);
