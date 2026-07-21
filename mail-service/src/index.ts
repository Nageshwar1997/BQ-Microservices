import 'dotenv/config';

import { setDefaultResultOrder } from 'node:dns';

import { shutdown } from './bootstrap/shutdown.js';
import { startup } from './bootstrap/startup.js';

/**
 * Some cloud hosts (e.g. Render) resolve SMTP hosts like `smtp.gmail.com` to
 * both IPv4 and IPv6 addresses but don't actually route outbound IPv6
 * traffic, so an IPv6 connection attempt fails with ENETUNREACH/ETIMEDOUT.
 * Forcing IPv4 first avoids ever trying the unreachable address.
 */
setDefaultResultOrder('ipv4first');

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
