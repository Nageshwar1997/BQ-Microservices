import { requireEnv, requirePort } from '@beautinique/shared-utils';

const {
  // A
  // B

  BULL_MQ_HOST,
  BULL_MQ_PORT,
  BULL_MQ_PASSWORD,
  BULL_MQ_USERNAME,

  // C

  BREVO_API_KEY,

  // D
  // E
  // F
  // G
  // H
  // I
  // J
  // K
  // L
  // M

  MAIL_FROM,

  // N

  NODE_ENV,

  // O
  // P

  PORT,

  // Q
  // R
  // S

  SERVICE_NAME,

  // T
  // U
  // V
  // W
  // X
  // Y
  // Z
} = process.env;

export const envs = {
  // A
  // B
  // C
  // D
  // E
  // F
  // G
  // H
  // I

  is_dev: NODE_ENV === 'development',

  // J
  // K
  // L
  // M

  mail: {
    apiKey: requireEnv(BREVO_API_KEY, 'BREVO_API_KEY'),
    from: requireEnv(MAIL_FROM, 'MAIL_FROM'),
  },

  // N
  // O
  // P

  port: requirePort(PORT, 'PORT'),

  // Q
  // R

  redis: {
    bull_mq: {
      host: requireEnv(BULL_MQ_HOST, 'BULL_MQ_HOST'),
      port: requirePort(BULL_MQ_PORT, 'BULL_MQ_PORT'),
      password: BULL_MQ_PASSWORD,
      username: BULL_MQ_USERNAME,
    },
  },

  // S

  service_name: requireEnv(SERVICE_NAME, 'SERVICE_NAME'),

  // T
  // U
  // V
  // W
  // X
  // Y
  // Z
} as const;
