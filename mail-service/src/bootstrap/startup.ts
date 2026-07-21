import { logger, transporter, workerManager } from '../configs/index.js';
import {
  // isShuttingDown,
  resetShuttingDown,
  resetStarted,
  setStarted,
  startHttpServer,
} from './server.js';

// const TRANSPORTER_RETRY_DELAY_MS = 30_000;
// const WORKER_START_RETRY_DELAY_MS = 30_000;

/* -------------------------------------------------------------------------- */
/*                            Mail Transporter Connect                        */
/* -------------------------------------------------------------------------- */

/**
 * Connects the mail transporter (verifies the Brevo API key), retrying in
 * the background on failure.
 *
 * Runs independently of the HTTP server so a slow or unreachable mail
 * provider never blocks the service from binding its port.
 */
// const connectTransporterWithRetry = async (): Promise<void> => {
//   while (!isShuttingDown() && !transporter.isConnected()) {
//     try {
//       await transporter.start();
//       return;
//     } catch {
//       await new Promise((resolve) => setTimeout(resolve, TRANSPORTER_RETRY_DELAY_MS));
//     }
//   }
// };

/* -------------------------------------------------------------------------- */
/*                            BullMQ Worker Start                             */
/* -------------------------------------------------------------------------- */

/**
 * Starts the BullMQ worker once the transporter is connected, polling in
 * the background so it never picks up a job it can't yet send.
 */
// const startWorkerWithRetry = async (): Promise<void> => {
//   while (!isShuttingDown() && !transporter.isConnected()) {
//     await new Promise((resolve) => setTimeout(resolve, WORKER_START_RETRY_DELAY_MS));
//   }

//   if (!isShuttingDown()) {
//     workerManager.start();
//   }
// };

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
 * 2. Connect the mail transporter (non-blocking, retried in the background).
 * 3. Start the BullMQ worker once the transporter is connected (non-blocking,
 *    retried in the background).
 */
export const startup = async (): Promise<void> => {
  if (!setStarted()) {
    return;
  }

  try {
    await startHttpServer();

    await transporter.start();
    workerManager.start();

    // void connectTransporterWithRetry();
    // void startWorkerWithRetry();

    logger.info('✅ Mail service initialized');

    resetShuttingDown();
  } catch (error) {
    resetStarted();

    resetShuttingDown();

    logger.error(`❌ Failed to start mail service: ${String(error)}`);

    process.exit(1);
  }
};
