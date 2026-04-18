import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { envs } from '@/envs';

export const { errorLogger, logger, requestLogger } = LoggerMiddleware.createLogger({
  serviceName: 'Worker-Service',
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
