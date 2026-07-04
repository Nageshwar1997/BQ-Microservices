import { connectDb } from '@beautinique/backend-mongoose';
import { bullQueue } from '@beautinique/be-jobs';

import { workerManager } from '../classes/index.js';
import { databaseConfigs, logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { registerDatabaseEvents } from './database-events.js';
import { resetShuttingDown, resetStarted, setStarted, startHttpServer } from './server.js';

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
 * 2. Connect MongoDB.
 * 3. Start the HTTP server.
 * 4. Connect BullMQ.
 * 5. Start background workers.
 */
export const startup = async (): Promise<void> => {
  if (!setStarted()) {
    return;
  }

  try {
    registerDatabaseEvents();

    await connectDb(databaseConfigs);

    await startHttpServer();

    bullQueue.connect(envs.redis.job);

    workerManager.start();

    logger.info('✅ Media service initialized');

    resetShuttingDown();
  } catch (error: unknown) {
    resetStarted();

    resetShuttingDown();

    logger.error('❌ Failed to start media service:', error);

    process.exit(1);
  }
};
