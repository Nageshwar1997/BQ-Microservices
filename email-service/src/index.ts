import 'dotenv/config';
import path from 'path';
import express, { type Request, type Response } from 'express';
import { parse } from 'qs';
import { envs } from './envs';
import { errorLogger, logger, requestLogger } from './configs';
import { CorsMiddleware, RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import { ORIGINS } from './constants';

const app = express();

// ----------------- MIDDLEWARES ORDER -----------------

// 1. Assign requestId first (for tracing logs)
app.use(RequestMiddleware.requestId);

// 2. Body parsers & static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve('public')));
app.set('query parser', (str: string) => parse(str));

// 3. Logger (logs all requests)
app.use(requestLogger);

// 4. Custom middlewares
app.use(ResponseMiddleware.success);
app.use(CorsMiddleware.checkOrigin({ origins: ORIGINS }));

// ----------------- ROUTES -----------------
// Home Route
app.get('/', (_: Request, res: Response) => res.success(200, 'Welcome to the Email Service API'));
app.get('/health', (_: Request, res: Response) => res.success(200, 'Email Service is healthy'));

// ----------------- ERROR HANDLING -----------------
app.use(ResponseMiddleware.notFound);
app.use(errorLogger);
app.use(ResponseMiddleware.error({ isDev: envs.is_dev }));

(async () => {
  try {
    app.listen(envs.port, () => {
      logger.info(`Server running on port: ${envs.port}`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
})();

async function shutdown() {
  try {
    logger.warn('🛑 Shutting down...');
    logger.info('✅ Cleanup done');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Shutdown error:', err);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app };
