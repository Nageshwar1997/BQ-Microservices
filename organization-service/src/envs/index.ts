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

  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_BASE_URL,

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

  // Optional - best-effort pincode/state cross-check on seller submit. `undefined`
  // when not configured just means that check silently no-ops (graceful degrade,
  // see assignment plan doc section 5.5 - core logic never depends on Maps).
  google_maps_api_key: GOOGLE_MAPS_API_KEY ?? undefined,
  google_maps_base_url: GOOGLE_MAPS_BASE_URL ?? 'https://maps.googleapis.com',

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
  // V
  // W
  // X
  // Y
  // Z
} as const;
