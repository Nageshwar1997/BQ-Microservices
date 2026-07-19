import type { Server } from 'node:http';
import type { Socket } from 'node:net';

import { app } from '../app.js';
import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';

const KEEP_ALIVE_TIMEOUT = 65_000;

const SERVER_TIMEOUTS = {
  keepAlive: KEEP_ALIVE_TIMEOUT,
  headers: KEEP_ALIVE_TIMEOUT + 1_000,
} as const;

/* -------------------------------------------------------------------------- */
/*                               HTTP Server                                  */
/* -------------------------------------------------------------------------- */

let server: Server | null = null;

/**
 * Tracks all active TCP connections.
 *
 * Used during graceful shutdown to destroy hanging sockets.
 */
const connections = new Set<Socket>();

/**
 * Tracks the current server lifecycle state.
 */
let started = false;
let shuttingDown = false;

/* -------------------------------------------------------------------------- */
/*                              Public Helpers                                */
/* -------------------------------------------------------------------------- */

/**
 * Returns whether the HTTP server is currently listening.
 */
export const isServerRunning = (): boolean => server?.listening ?? false;

/* -------------------------------------------------------------------------- */
/*                              Start HTTP Server                             */
/* -------------------------------------------------------------------------- */

/**
 * Starts the Express HTTP server.
 */
export const startHttpServer = async (): Promise<void> => {
  if (server?.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const httpServer = app.listen(envs.port);

    const onListening = () => {
      httpServer.off('error', onError);
      httpServer.off('listening', onListening);

      logger.info(`🚀 Server running on port: ${String(envs.port)}`);

      resolve();
    };

    const onError = (error: Error) => {
      httpServer.off('listening', onListening);
      httpServer.off('error', onError);

      reject(error);
    };

    httpServer.once('listening', onListening);
    httpServer.once('error', onError);

    server = httpServer;
  });

  if (!server) {
    throw new Error('Failed to initialize HTTP server.');
  }

  server.keepAliveTimeout = SERVER_TIMEOUTS.keepAlive;
  server.headersTimeout = SERVER_TIMEOUTS.headers;

  server.on('error', (error) => {
    logger.error(`❌ HTTP server error: ${error}`);
  });

  server.on('close', () => {
    logger.info('🌐 HTTP server closed');
  });

  server.on('connection', (socket: Socket) => {
    connections.add(socket);

    socket.on('close', () => {
      connections.delete(socket);
    });
  });
};

/* -------------------------------------------------------------------------- */
/*                               Stop HTTP Server                             */
/* -------------------------------------------------------------------------- */

/**
 * Stops the HTTP server from accepting new connections.
 *
 * Existing requests are allowed to complete before the server is closed.
 */
export const stopHttpServer = async (): Promise<void> => {
  if (!server?.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  server = null;
};

/**
 * Destroys all active socket connections.
 *
 * Used as the final step during graceful shutdown.
 */
export const destroyConnections = (): void => {
  for (const socket of connections) {
    if (!socket.destroyed) {
      socket.destroy();
    }
  }

  connections.clear();
};

/* -------------------------------------------------------------------------- */
/*                                Started State                               */
/* -------------------------------------------------------------------------- */

export const setStarted = (): boolean => {
  if (started) {
    return false;
  }

  started = true;

  return true;
};

export const resetStarted = (): boolean => {
  if (!started) {
    return false;
  }

  started = false;

  return true;
};

/* -------------------------------------------------------------------------- */
/*                             Shutting Down State                            */
/* -------------------------------------------------------------------------- */

export const setShuttingDown = (): boolean => {
  if (shuttingDown) {
    return false;
  }

  shuttingDown = true;

  return true;
};

export const resetShuttingDown = (): boolean => {
  if (!shuttingDown) {
    return false;
  }

  shuttingDown = false;

  return true;
};
