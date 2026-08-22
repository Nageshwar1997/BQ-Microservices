import { connectDb, connectionState } from '@beautinique/backend-mongoose';

import { databaseConfigs, logger, redisCacheManager, workerManager } from '../configs/index.js';
import { registerDatabaseEvents } from './database-events.js';
import {
  isShuttingDown,
  resetShuttingDown,
  resetStarted,
  setStarted,
  startHttpServer,
} from './server.js';

const DB_RETRY_DELAY_MS = 30_000;
const WORKER_START_RETRY_DELAY_MS = 30_000;

/* -------------------------------------------------------------------------- */
/*                               MongoDB Connect                              */
/* -------------------------------------------------------------------------- */

/**
 * Connects MongoDB, retrying in the background on failure.
 *
 * Runs independently of the HTTP server so a slow or unreachable database
 * never blocks the service from binding its port.
 */
const connectDatabaseWithRetry = async (): Promise<void> => {
  while (!isShuttingDown()) {
    try {
      await connectDb(databaseConfigs);
      return;
    } catch (error) {
      logger.error(
        `❌ MongoDB connection failed, retrying in ${String(DB_RETRY_DELAY_MS / 1000)}s: ${String(error)}`,
      );

      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY_MS));
    }
  }
};

/* -------------------------------------------------------------------------- */
/*                            BullMQ Worker Start                             */
/* -------------------------------------------------------------------------- */

/**
 * Starts the background worker (see `WorkerManager` -
 * `product-service-queue.seller-admin-assigned`) once MongoDB is connected,
 * polling in the background so it never has to touch a not-yet-ready DB
 * connection. Unlike `organization-service`'s worker, this one doesn't
 * request a startup resync - a cold-start/fresh-DB gap here just means a
 * product-review ownership check misses cache until the next real
 * assignment/reassignment event republishes it (a Redis-only cache, not the
 * one thing gating whether a seller is routed anywhere at all).
 */
const startWorkerWithRetry = async (): Promise<void> => {
  while (!isShuttingDown() && !connectionState.isConnected()) {
    await new Promise((resolve) => setTimeout(resolve, WORKER_START_RETRY_DELAY_MS));
  }

  if (!isShuttingDown()) {
    workerManager.start();
  }
};

/* -------------------------------------------------------------------------- */
/*                              Startup Sequence                              */
/* -------------------------------------------------------------------------- */

/**
 * Starts the complete application.
 *
 * Safe to call multiple times.
 *
 * Startup order:
 * 1. Register MongoDB event listeners.
 * 2. Start the HTTP server.
 * 3. Connect MongoDB and Redis (non-blocking, retried in the background).
 * 4. Start the background worker once MongoDB is connected (non-blocking,
 *    retried in the background).
 */
export const startup = async (): Promise<void> => {
  if (!setStarted()) {
    return;
  }

  try {
    registerDatabaseEvents();

    await startHttpServer();

    void redisCacheManager.connect();
    void connectDatabaseWithRetry();
    void startWorkerWithRetry();

    logger.info('✅ Product service initialized');

    resetShuttingDown();
  } catch (error: unknown) {
    resetStarted();

    resetShuttingDown();

    logger.error(`❌ Failed to start product service: ${String(error)}`);

    process.exit(1);
  }
};
