import { connectDb } from '@beautinique/backend-mongoose';
import { bullQueue } from '@beautinique/be-jobs';

import { workerManager } from '../classes/index.js';
import { databaseConfigs, logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { registerDatabaseEvents } from './database-events.js';
import { startHttpServer } from './server.js';

/* -------------------------------------------------------------------------- */
/*                              Startup Sequence                              */
/* -------------------------------------------------------------------------- */

let started = false;

/**
 * Starts the complete application.
 *
 * Startup order:
 * 1. Register database event listeners.
 * 2. Connect MongoDB.
 * 3. Start HTTP server.
 * 4. Connect BullMQ.
 * 5. Start workers.
 */
export const startup = async (): Promise<void> => {
  if (started) {
    return;
  }

  started = true;
  try {
    registerDatabaseEvents();

    await connectDb(databaseConfigs);

    await startHttpServer();

    bullQueue.connect(envs.redis.job);

    workerManager.start();

    logger.info('✅ Media service initialized');
  } catch (error) {
    started = false;

    logger.error('❌ Failed to start media service:', error);

    process.exit(1);
  }
};
