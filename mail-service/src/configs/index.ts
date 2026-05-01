import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { envs } from '../envs';

export const { errorLogger, logger, requestLogger } = LoggerMiddleware.createLogger({
  serviceName: envs.service_name,
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
