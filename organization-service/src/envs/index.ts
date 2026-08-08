import { requireEnv, requirePort } from '@beautinique/shared-utils';
const {
  // A
  // B
  // C

  CACHE_HOST,
  CACHE_PORT,
  CACHE_PASSWORD,
  CACHE_USERNAME,

  // D

  DATABASE_NAME,

  // E
  // F
  // G
  // H
  // I
  // J

  BULL_MQ_HOST,
  BULL_MQ_PORT,
  BULL_MQ_PASSWORD,
  BULL_MQ_USERNAME,

  // K
  // L
  // M

  MONGODB_URI,

  // N

  NODE_ENV,

  // O
  // P

  PORT,

  // Q
  // R
  // S

  SERVICE_NAME,
  SERVICE_SECRET,
  SUPPORT_INBOX_EMAIL,

  // T
  // U

  USER_SERVICE_BASE_URL,
  USER_SERVICE_SECRET,

  // V
  // W
  // X
  // Y
  // Z
} = process.env as Record<string, string>;

const is_dev = NODE_ENV === 'development';

export const envs = {
  // A
  // B
  // C
  // D

  database_name: requireEnv(DATABASE_NAME, 'DATABASE_NAME'),

  // E
  // F
  // G
  // H
  // I

  is_dev,

  // J
  // K
  // L
  // M

  mongo_uri: requireEnv(MONGODB_URI, 'MONGODB_URI'),

  // N
  // O
  // P

  port: requirePort(PORT, 'PORT'),

  // Q
  // R

  redis: {
    cache: {
      host: requireEnv(CACHE_HOST, 'REDIS_HOST'),
      port: requirePort(CACHE_PORT, 'REDIS_PORT'),
      password: requireEnv(CACHE_PASSWORD, 'REDIS_PASSWORD'),
      username: requireEnv(CACHE_USERNAME, 'REDIS_USERNAME'),
    },
    bull_mq: {
      host: requireEnv(BULL_MQ_HOST, 'BULL_MQ_HOST'),
      port: requirePort(BULL_MQ_PORT, 'BULL_MQ_PORT'),
      password: requireEnv(BULL_MQ_PASSWORD, 'BULL_MQ_PASSWORD'),
      username: requireEnv(BULL_MQ_USERNAME, 'BULL_MQ_USERNAME'),
    },
  },

  // S

  service_name: requireEnv(SERVICE_NAME, 'SERVICE_NAME'),
  service_secret: requireEnv(SERVICE_SECRET, 'SERVICE_SECRET'),
  support_inbox_email: requireEnv(SUPPORT_INBOX_EMAIL, 'SUPPORT_INBOX_EMAIL'),

  // T
  // U

  // Used by `UserServiceApi` to call `user-service` directly (not through the
  // gateway) - e.g. to sync a User's role when `createSeller` runs.
  user_service: {
    base_url: requireEnv(USER_SERVICE_BASE_URL, 'USER_SERVICE_BASE_URL'),
    secret: requireEnv(USER_SERVICE_SECRET, 'USER_SERVICE_SECRET'),
  },

  // V
  // W
  // X
  // Y
  // Z
} as const;
