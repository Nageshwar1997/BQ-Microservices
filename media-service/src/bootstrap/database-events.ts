import { mongoEvents } from '@beautinique/backend-mongoose';

import { logger } from '../configs/index.js';

/* -------------------------------------------------------------------------- */
/*                         Register MongoDB Event Listeners                   */
/* -------------------------------------------------------------------------- */

let registered = false;

/**
 * Registers all MongoDB lifecycle event listeners.
 *
 * Safe to call multiple times.
 */
export const registerDatabaseEvents = (): void => {
  if (registered) {
    return;
  }

  registered = true;

  mongoEvents
    .on('connecting', () => {
      logger.info('🔌 Connecting to MongoDB...');
    })
    .on('connected', () => {
      logger.info('✅ MongoDB connected');
    })
    .on('disconnecting', () => {
      logger.warn('⚠️ Disconnecting MongoDB...');
    })
    .on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
    })
    .on('error', (error) => {
      logger.error(`❌ MongoDB error: ${error}`);
    });
};
