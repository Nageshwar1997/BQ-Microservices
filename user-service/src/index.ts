import 'dotenv/config';

import { shutdown } from './bootstrap/shutdown.js';
import { startup } from './bootstrap/startup.js';

/* -------------------------------------------------------------------------- */
/*                            Process Signal Handlers                         */
/* -------------------------------------------------------------------------- */

/**
 * Gracefully shuts down the application when interrupted.
 */
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

/**
 * Gracefully shuts down the application when terminated.
 */
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

/* -------------------------------------------------------------------------- */
/*                                 Bootstrap                                  */
/* -------------------------------------------------------------------------- */

void startup();
