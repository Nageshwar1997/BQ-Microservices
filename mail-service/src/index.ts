import { CorsMiddleware, RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { parse } from 'qs';
import { transporter } from './classes';
import { errorLogger, logger, requestLogger } from './configs';
import { ORIGINS } from './constants';
import { envs } from './envs';
import { router } from './routes';

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
app.use(CorsMiddleware.checkOrigin({ origins: ORIGINS }));

/* ---------------- ROUTES ---------------- */

// Home Route
app.get('/', (_: Request, res: Response) => res.success(200, 'Welcome to the Mail Service API'));

// Health Route
app.get('/health', (_: Request, res: Response) => res.success(200, 'Mail Service is healthy'));

// API Routes
app.use('/api/v1', router);

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

    // 🔥 Connect transporter
    transporter
      .connect()
      .then(() => {
        logger.info('📨 Transporter connected');
      })
      .catch((err) => {
        logger.error('❌ Transporter connection failed:', err);
      });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

/* ---------------- SHUTDOWN ---------------- */

async function shutdown() {
  logger.warn('🛑 Shutting down...');

  try {
    // Close transporter
    await transporter.close();
    logger.info('✅ Transporter closed');

    // Close server
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
