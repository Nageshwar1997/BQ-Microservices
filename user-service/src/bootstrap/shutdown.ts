import { disconnectDB } from '@beautinique/backend-mongoose';

import { jobProducer, logger } from '../configs/index.js';
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
  { name: 'Job Producer', task: jobProducer.close.bind(jobProducer) },
  { name: 'MongoDB', task: disconnectDB },
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
 * 2. Stop BullMQ workers.
 * 3. Close BullMQ connection.
 * 4. Disconnect MongoDB.
 * 5. Destroy any remaining sockets.
 * 6. Exit process.
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
          logger.warn('⚠️  Stopping %s...', name);

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
