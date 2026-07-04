import { disconnectDB } from '@beautinique/backend-mongoose';
import { bullQueue } from '@beautinique/be-jobs';

import { workerManager } from '../classes/index.js';
import { logger } from '../configs/index.js';
import { destroyConnections, isServerRunning, stopHttpServer } from './server.js';

/* -------------------------------------------------------------------------- */
/*                             Shutdown Sequence                              */
/* -------------------------------------------------------------------------- */

let isShuttingDown = false;

/**
 * Gracefully shuts down the application.
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
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.warn(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    if (isServerRunning()) {
      await stopHttpServer();
    }

    const shutdownResults = await Promise.allSettled([
      workerManager.stop(),
      bullQueue.close(),
      disconnectDB(),
    ]);

    const services = ['Worker Manager', 'Bull Queue', 'MongoDB'] as const;

    shutdownResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        logger.info(`✅ ${services[index]} stopped`);
      } else {
        logger.error(`❌ Failed to stop ${services[index]}:`, result.reason);
      }
    });

    destroyConnections();

    logger.info('✅ Graceful shutdown completed');

    process.exitCode = 0;
  } catch (error: unknown) {
    logger.error('❌ Shutdown failed:', error);

    process.exitCode = 1;
  } finally {
    process.exit();
  }
};
