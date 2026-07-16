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
 * 1. Connect the SMTP transporter.
 * 2. Start the HTTP server.
 * 3. Start the BullMQ worker.
 */
export const startup = async (): Promise<void> => {
  if (!setStarted()) {
    return;
  }

  try {
    await transporter.start();
    await startHttpServer();

    workerManager.start();

    logger.info('✅ Mail service initialized');

    resetShuttingDown();
  } catch (error) {
    resetStarted();

    resetShuttingDown();

    logger.error(`❌ Failed to start mail service: ${String(error)}`);

    process.exit(1);
  }
};
