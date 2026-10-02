import { requireEnv, requirePort } from '@beautinique/shared-utils';

const {
  // A

  ADMIN_BASE_URL,

  // B

  BULL_MQ_HOST,
  BULL_MQ_PORT,
  BULL_MQ_PASSWORD,
  BULL_MQ_USERNAME,

  // C

  CLIENT_BASE_URL,

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

  MASTER_BASE_URL,

  MAIL_FROM,

  // N

  NODE_ENV,

  // O
  // P

  PORT,

  // Q
  // R
  // S

  SELLER_BASE_URL,

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

  // Frontend origins allowed to read the public `/health` + `/wake-up` routes from a browser
  // (the frontends' boot-time wake-up ping) - see `publicRouteCors` in `app.ts`.
  frontend_urls: {
    admin: requireEnv(ADMIN_BASE_URL, 'ADMIN_BASE_URL'),
    client: requireEnv(CLIENT_BASE_URL, 'CLIENT_BASE_URL'),
    master: requireEnv(MASTER_BASE_URL, 'MASTER_BASE_URL'),
    seller: requireEnv(SELLER_BASE_URL, 'SELLER_BASE_URL'),
  },

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
