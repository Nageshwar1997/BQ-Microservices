import type { Server } from 'node:http';
import type { Socket } from 'node:net';

import { app } from '../app.js';
import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';

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

/* -------------------------------------------------------------------------- */
/*                              Public Helpers                                */
/* -------------------------------------------------------------------------- */

/**
 * Returns the current HTTP server instance.
 */
export const getServer = (): Server | null => server;

/**
 * Returns all active socket connections.
 */
export const getConnections = (): Set<Socket> => connections;

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

      logger.info(`🚀 Server running on port: ${String(envs.port)}`);

      resolve();
    };

    const onError = (error: Error) => {
      httpServer.off('listening', onListening);

      reject(error);
    };

    httpServer.once('listening', onListening);
    httpServer.once('error', onError);

    server = httpServer;
  });

  if (!server) {
    throw new Error('Failed to initialize HTTP server.');
  }

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  server.on('error', (error) => {
    logger.error('❌ HTTP server error:', error);
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
 * Stops accepting new requests.
 *
 * Existing connections are allowed to finish.
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
};


/**
 * Destroys all active socket connections.
 *
 * Used as the final step during graceful shutdown.
 */
export const destroyConnections = (): void => {
  for (const socket of connections) {
    socket.destroy();
  }

  connections.clear();
};