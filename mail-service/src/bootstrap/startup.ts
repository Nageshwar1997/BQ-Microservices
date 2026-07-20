import { logger, transporter, workerManager } from '../configs/index.js';
import {
  isShuttingDown,
  resetShuttingDown,
  resetStarted,
  setStarted,
  startHttpServer,
} from './server.js';

const TRANSPORTER_RETRY_DELAY_MS = 30_000;

/* -------------------------------------------------------------------------- */
/*                          SMTP Transporter Connect                          */
/* -------------------------------------------------------------------------- */

/**
 * Connects the SMTP transporter, retrying in the background on failure.
 *
 * Runs independently of the HTTP server so a slow or unreachable SMTP host
 * never blocks the service from binding its port.
 */
const connectTransporterWithRetry = async (): Promise<void> => {
  while (!isShuttingDown() && !transporter.isConnected()) {
    try {
      await transporter.start();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, TRANSPORTER_RETRY_DELAY_MS));
    }
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
 * 1. Start the HTTP server.
 * 2. Start the BullMQ worker.
 * 3. Connect the SMTP transporter (non-blocking, retried in the background).
 *
 * The worker starts before the transporter is connected - each job handler
 * checks readiness itself and fails fast, letting BullMQ's own retry/backoff
 * pick the job back up once the transporter is ready.
 */
export const startup = async (): Promise<void> => {
  if (!setStarted()) {
    return;
  }

  try {
    await startHttpServer();

    workerManager.start();

    void connectTransporterWithRetry();

    logger.info('✅ Mail service initialized');

    resetShuttingDown();
  } catch (error) {
    resetStarted();

    resetShuttingDown();

    logger.error(`❌ Failed to start mail service: ${String(error)}`);

    process.exit(1);
  }
};
