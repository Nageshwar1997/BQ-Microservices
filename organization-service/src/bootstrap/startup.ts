import { connectDb, connectionState } from '@beautinique/backend-mongoose';

import {
  databaseConfigs,
  jobProducer,
  logger,
  redisCacheManager,
  workerManager,
} from '../configs/index.js';
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
 * `organization-service-queue.admin-territory-synced`) once MongoDB is
 * connected, polling in the background so it never has to touch a
 * not-yet-ready DB connection. Once running, requests a full resync of the
 * `AdminTerritory` mirror from user-service - covers a fresh/wiped DB or a
 * cold deploy, since BullMQ doesn't retain already-processed jobs to
 * replay. Safe even if organization-service's own worker isn't fully ready
 * the instant the response comes back - BullMQ jobs persist in Redis until
 * consumed, nothing is lost either way.
 */
const startWorkerWithRetry = async (): Promise<void> => {
  while (!isShuttingDown() && !connectionState.isConnected()) {
    await new Promise((resolve) => setTimeout(resolve, WORKER_START_RETRY_DELAY_MS));
  }

  if (!isShuttingDown()) {
    workerManager.start();

    await jobProducer.addJob('user-service-queue', 'resync-admin-territories', {});
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

    logger.info('✅ Organization service initialized');

    resetShuttingDown();
  } catch (error: unknown) {
    resetStarted();

    resetShuttingDown();

    logger.error(`❌ Failed to start organization service: ${String(error)}`);

    process.exit(1);
  }
};
