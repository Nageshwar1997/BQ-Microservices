
import { logger, transporter, workerManager } from '../configs/index.js';
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
 * 4. Start background workers.
 */
export const startup = async (): Promise<void> => {
  if (!setStarted()) {
    return;
  }

  try {
    await Promise.all([startHttpServer(), transporter.start()]);

    workerManager.start();

    logger.info('✅ Media service initialized');

    resetShuttingDown();
  } catch (error) {
    resetStarted();

    resetShuttingDown();

    logger.error(`❌ Failed to start media service: ${String(error)}`);

    process.exit(1);
  }
};
