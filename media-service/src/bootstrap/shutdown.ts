import { disconnectDB } from '@beautinique/backend-mongoose';
import { bullQueue } from '@beautinique/be-jobs';

import { workerManager } from '../classes/index.js';
import { logger } from '../configs/index.js';
import { destroyConnections, isServerRunning, setShuttingDown, stopHttpServer } from './server.js';
interface IShutdownTask {
  readonly name: string;
  readonly task: () => Promise<void>;
}

const shutdownTasks: readonly IShutdownTask[] = Object.freeze([
  { name: 'Worker Manager', task: workerManager.stop.bind(workerManager) },
  { name: 'Bull Queue', task: bullQueue.close.bind(bullQueue) },
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
        logger.error(`❌ Failed to stop ${name}:`, result.reason);
      }
    });

    destroyConnections();

    logger.info('✅ Graceful shutdown completed');

    process.exitCode = 0;
  } catch (error: unknown) {
    logger.error('❌ Shutdown failed:', error);

    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode);
  }
};
