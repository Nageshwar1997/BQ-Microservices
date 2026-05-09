import { RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { parse } from 'qs';
import { bullWorker } from './classes';
import { errorLogger, logger, requestLogger } from './configs';
import { envs } from './envs';

/* ---------------- APP SETUP ---------------- */

const app = express();
let server: ReturnType<typeof app.listen> | null = null;

/* ---------------- MIDDLEWARES ---------------- */

// 1. Request ID
app.use(RequestMiddleware.requestId);

// 2. Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve('public')));
app.set('query parser', (str: string) => parse(str));

// 3. Logger
app.use(requestLogger);

// 4. Custom middlewares
app.use(ResponseMiddleware.success);

/* ---------------- ROUTES ---------------- */

app.get('/', (_: Request, res: Response) => res.success(200, 'Welcome to the Worker Service API'));

app.get('/health', (_: Request, res: Response) => res.success(200, 'Worker Service is healthy'));

/* ---------------- ERROR HANDLING ---------------- */

app.use(ResponseMiddleware.notFound);
app.use(errorLogger);
app.use(ResponseMiddleware.error({ isDev: envs.is_dev }));

/* ---------------- START ---------------- */

async function start() {
  try {
    // 🌐 Start server
    server = app.listen(envs.port, () => {
      logger.info(`🚀 Server running on port: ${envs.port}`);
    });

    // 🔥 Start workers AFTER server is up
    bullWorker.startAll();
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

/* ---------------- SHUTDOWN ---------------- */

async function shutdown() {
  logger.warn('🛑 Shutting down...');

  try {
    // 1️⃣ Close workers
    await bullWorker.closeAll();
    logger.info('✅ Workers closed');

    // 2️⃣ Close server gracefully
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => {
          logger.info('🌐 Server closed');
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

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/* ---------------- BOOTSTRAP ---------------- */

start();

/* ---------------- EXPORT ---------------- */

export { app };
