import { logger, transporter, workerManager } from '../configs/index.js';
import {
  destroyConnections,
  isServerRunning,
  resetStarted,
  setShuttingDown,
  stopHttpServer,
} from './server.js';

interface IShutdownTask {
  readonly name: string;
  readonly task: () => Promise<void>;
}

const shutdownTasks: readonly IShutdownTask[] = Object.freeze([
  { name: 'Worker Manager', task: workerManager.stop.bind(workerManager) },
]);

/* -------------------------------------------------------------------------- */
/*                             Shutdown Sequence                              */
/* -------------------------------------------------------------------------- */

/**
 * Gracefully shuts down the application.
 *
 * Safe to call multiple times.
 *
 * Shutdown order:
 * 1. Stop accepting HTTP requests.
 * 2. Stop the BullMQ worker.
 * 3. Close the SMTP transporter.
 * 4. Destroy any remaining sockets.
 * 5. Exit process.
 */
export const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (!setShuttingDown()) {
    return;
  }

  logger.warn(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    if (isServerRunning()) {
      await stopHttpServer();
    }

    const outcomes = await Promise.all(
      shutdownTasks.map(async ({ name, task }) => {
        try {
          await task();
          return { name, status: 'fulfilled' as const };
        } catch (error) {
          return { name, status: 'rejected' as const, reason: error };
        }
      }),
    );

    outcomes.forEach((outcome) => {
      if (outcome.status === 'fulfilled') {
        logger.info(`✅ ${outcome.name} stopped successfully`);
      } else {
        logger.error(`❌ Failed to stop ${outcome.name}: ${String(outcome.reason)}`);
      }
    });

    transporter.stop();

    destroyConnections();

    logger.info('✅ Graceful shutdown completed');

    process.exitCode = 0;
  } catch (error) {
    logger.error(`❌ Shutdown failed: ${String(error)}`);

    process.exitCode = 1;
  } finally {
    resetStarted();

    process.exit(process.exitCode);
  }
};
