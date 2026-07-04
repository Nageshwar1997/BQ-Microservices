import { mongoEvents } from '@beautinique/backend-mongoose';

import { logger } from '../configs/index.js';

/* -------------------------------------------------------------------------- */
/*                         Register MongoDB Event Listeners                   */
/* -------------------------------------------------------------------------- */

/**
 * Registers all MongoDB lifecycle event listeners.
 *
 * Call this once during application startup.
 */
export const registerDatabaseEvents = (): void => {
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
      logger.error('❌ MongoDB error:', error);
    });
};
