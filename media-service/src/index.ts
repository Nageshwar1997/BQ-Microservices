import 'dotenv/config';

import type { Socket } from 'node:net';

import {
  connectDb,
  connectionState,
  disconnectDB,
  getConnectionHealth,
  mongoEvents,
} from '@beautinique/backend-mongoose';
import { bullQueue } from '@beautinique/be-jobs';
import {
  checkDbConnection,
  errorResponse,
  notFoundResponse,
  serviceAccess,
  setRequestId,
  successResponse,
} from '@beautinique/be-middlewares';
import { HEADERS_MAP } from '@beautinique/shared-constants';
import express from 'express';
import path from 'path';

import { workerManager } from './classes/index.js';
import { databaseConfigs, errorLogs, logger, requestLogs } from './configs/index.js';
import { METHODS_AND_PATHS } from './constants/index.js';
import { envs } from './envs/index.js';
import { router } from './routes/index.js';

const { base } = METHODS_AND_PATHS;

/* ---------------- APP ---------------- */

const app = express();

let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

/* ---------------- CONNECTIONS ---------------- */

const connections = new Set<Socket>();

/* ---------------- DATABASE EVENTS ---------------- */

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

/* ---------------- MIDDLEWARES ---------------- */

// 1. Request ID
app.use(setRequestId);

// 2. Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve('public')));

// 3. Logger
app.use(requestLogs);

// 4. Custom middlewares
app.use(successResponse);

// 5. Check DB connection
app.use(checkDbConnection(connectionState.isConnected));

/* ---------------- ROUTES ---------------- */

// Home Route
app.get('/', (_, res) => {
  res.success(200, 'Welcome to the Media Service API');
});

// Health Route
app.get('/health', (_, res) => {
  res.success(200, 'Media Service is healthy', {
    database: getConnectionHealth(),
    connected: connectionState.isConnected(),
  });
});

// Api Routes
app.use(
  base,
  serviceAccess({
    secret: envs.service_secret,
    headerName: HEADERS_MAP.serviceSecret,
  }),
  router,
);

/* ---------------- ERROR HANDLING ---------------- */

app.use(notFoundResponse);
app.use(errorLogs);
app.use(errorResponse({ isDev: envs.is_dev }));

/* ---------------- START ---------------- */

async function start(): Promise<void> {
  try {
    // Connect MongoDB first
    await connectDb(databaseConfigs);

    // Start HTTP server
    await new Promise<void>((resolve, reject) => {
      const httpServer = app.listen(envs.port);

      const onError = (error: Error) => {
        httpServer.off('listening', onListening);
        reject(error);
      };

      const onListening = () => {
        httpServer.off('error', onError);

        logger.info(`🚀 Server running on port: ${String(envs.port)}`);

        resolve();
      };

      httpServer.once('error', onError);
      httpServer.once('listening', onListening);

      server = httpServer;
    });

    if (!server) {
      throw new Error('Failed to initialize HTTP server.');
    }

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

    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;

    bullQueue.connect(envs.redis.job);

    workerManager.start();

    logger.info('✅ Media service initialized');
  } catch (error) {
    logger.error('❌ Failed to start media service:', error);

    process.exit(1);
  }
}

/* ---------------- SHUTDOWN ---------------- */

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.warn(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    if (server?.listening) {
      // Force close hanging sockets after timeout
      const forceCloseTimer = setTimeout(() => {
        logger.warn('⚠️ Force closing hanging connections...');

        for (const socket of connections) {
          socket.destroy();
        }
      }, 10_000);

      try {
        // Stop accepting new connections
        await new Promise<void>((resolve, reject) => {
          server?.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      } finally {
        clearTimeout(forceCloseTimer);
      }
    }

    const shutdownResults = await Promise.allSettled([
      workerManager.stop(),
      bullQueue.close(),
      disconnectDB(),
    ]);

    const services = ['Worker Manager', 'Bull Queue', 'MongoDB'];

    shutdownResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        logger.info(`✅ ${services[index]} stopped`);
      } else {
        logger.error(`❌ Failed to stop ${services[index]}:`, result.reason);
      }
    });

    logger.info('✅ Graceful shutdown completed');

    process.exitCode = 0;
  } catch (error) {
    logger.error('❌ Shutdown failed:', error);

    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

/* ---------------- PROCESS SIGNALS ---------------- */

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

/* ---------------- BOOTSTRAP ---------------- */

void start();

/* ---------------- EXPORT ---------------- */

export { app };
