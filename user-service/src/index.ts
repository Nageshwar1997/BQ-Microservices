import { connectToDB } from '@beautinique/be-configs';
import { bullQueue } from '@beautinique/be-jobs';
import {
  checkDbConnection,
  errorResponse,
  notFoundResponse,
  serviceAccess,
  setRequestId,
  successResponse,
} from '@beautinique/be-middlewares';
import 'dotenv/config';
import express from 'express';
import type { Socket } from 'node:net';
import path from 'path';
import { parse } from 'qs';
import { redisCache } from './classes';
import { databaseConfigs, errorLogs, isDbConnected, logger, requestLogs } from './configs';
import { HEADERS_KEYS, METHODS_AND_PATHS } from './constants';
import { envs } from './envs';
import { router } from './routes';

const { base, health, home } = METHODS_AND_PATHS;

/* ---------------- APP SETUP ---------------- */

const app = express();

app.set('query parser', (str: string) => parse(str));

let server: ReturnType<typeof app.listen> | null = null;

/* ---------------- CONNECTION TRACKING ---------------- */

const connections = new Set<Socket>();

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
app.use(checkDbConnection(isDbConnected));

/* ---------------- ROUTES ---------------- */

// Home Route
router[home.method](home.path, (_, res) => res.success(200, 'Welcome to the User Service API'));

// Health Route
router[health.method](health.path, (_, res) => res.success(200, 'User Service is healthy'));

// Api Routes
app.use(
  base,
  serviceAccess({ secret: envs.service_secret, headerName: HEADERS_KEYS.serviceSecret }),
  router,
);

/* ---------------- ERROR HANDLING ---------------- */

app.use(notFoundResponse);
app.use(errorLogs);
app.use(errorResponse({ isDev: envs.is_dev }));

/* ---------------- START ---------------- */

async function start() {
  try {
    // 🌐 Start server
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => {
        reject(err);
      };

      const httpServer = app.listen(envs.port, () => {
        httpServer.off('error', onError);

        logger.info(`🚀 Server running on port: ${envs.port}`);

        resolve();
      });

      server = httpServer;

      httpServer.once('error', onError);
    });

    const httpServer = server;

    if (!httpServer) {
      throw new Error('HTTP server did not initialize');
    }

    httpServer.on('error', (err) => {
      logger.error('❌ HTTP server error:', err);
    });

    // Track active connections
    httpServer.on('connection', (socket: Socket) => {
      connections.add(socket);

      socket.on('close', () => {
        connections.delete(socket);
      });
    });

    // Optional hard timeouts
    httpServer.keepAliveTimeout = 65_000;
    httpServer.headersTimeout = 66_000;

    // 🔥 Start DB + Redis + Queue AFTER server starts
    await Promise.all([
      connectToDB(databaseConfigs),
      redisCache.connect(),
      bullQueue.connect(envs.redis.job),
    ]);

    logger.info('✅ User service initialized');
  } catch (err) {
    logger.error('❌ Failed to start server:', err);

    process.exit(1);
  }
}

/* ---------------- SHUTDOWN ---------------- */

async function shutdown(signal: string) {
  logger.warn(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // 🔥 Stop Redis + Queue first
    const results = await Promise.allSettled([redisCache.close(), bullQueue.close()]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`❌ Service ${index} failed to close:`, result.reason);
      }
    });

    logger.info('📦 Redis and queue stopped');

    if (server) {
      // Force close hanging sockets after timeout
      const forceCloseTimer = setTimeout(() => {
        logger.warn('⚠️ Force closing hanging connections...');

        for (const socket of connections) {
          socket.destroy();
        }
      }, 10_000);

      // Stop accepting new connections
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          clearTimeout(forceCloseTimer);

          if (err) return reject(err);

          logger.info('🌐 HTTP server closed');

          resolve();
        });
      });
    }

    logger.info('✅ Shutdown complete');

    process.exit(0);
  } catch (err) {
    logger.error('❌ Shutdown error:', err);

    process.exit(1);
  }
}

/* ---------------- PROCESS SIGNALS ---------------- */

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

/* ---------------- BOOTSTRAP ---------------- */

void start();

/* ---------------- EXPORT ---------------- */

export { app };
