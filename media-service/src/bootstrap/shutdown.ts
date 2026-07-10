import { disconnectDB } from '@beautinique/backend-mongoose';

import { jobProducer, logger, workerManager } from '../configs/index.js';
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
  { name: 'Bull Queue', task: jobProducer.close.bind(jobProducer) },
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

    const results = await Promise.allSettled(shutdownTasks.map(({ task }) => task()));

    results.forEach((result, index) => {
      const { name } = shutdownTasks[index];
      if (result.status === 'fulfilled') {
        logger.info(`✅ ${name} stopped successfully`);
      } else {
        logger.error(`❌ Failed to stop ${name}: ${String(result.reason)}`);
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
