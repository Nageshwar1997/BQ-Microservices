import { LoggerMiddleware } from '@beautinique/be-middlewares';
import { envs } from '@/envs';
import { createTransport } from 'nodemailer';

export const transporterConfig = createTransport({
  host: envs.mail.host,
  port: envs.mail.port,
  secure: false,
  auth: { user: envs.mail.user, pass: envs.mail.pass },
});

export const { errorLogger, logger, requestLogger } = LoggerMiddleware.createLogger({
  serviceName: 'User-Service',
  logDir: 'logs',
  level: envs.is_dev ? 'debug' : 'info',
});
