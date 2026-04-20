import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { envs } from '@/envs';

export const { errorLogger, logger, requestLogger } = LoggerMiddleware.createLogger({
  serviceName: 'Mail-Service',
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
