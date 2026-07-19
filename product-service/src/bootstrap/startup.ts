import { connectDb } from '@beautinique/backend-mongoose';

import { databaseConfigs, logger, redisCacheManager } from '../configs/index.js';
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
 * 2. Connect MongoDB and Redis in parallel.
 * 3. Start the HTTP server.
 */
export const startup = async (): Promise<void> => {
  if (!setStarted()) {
    return;
  }

  try {
    registerDatabaseEvents();

    await Promise.all([connectDb(databaseConfigs), redisCacheManager.connect()]);
    await startHttpServer();

    logger.info('✅ Product service initialized');

    resetShuttingDown();
  } catch (error: unknown) {
    resetStarted();

    resetShuttingDown();

    logger.error(`❌ Failed to start product service: ${String(error)}`);

    process.exit(1);
  }
};
