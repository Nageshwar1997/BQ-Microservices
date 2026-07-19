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

  IS_DEV,

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
  // O
  // P

  PORT,

  // Q
  // R
  // S

  SERVICE_NAME,
  SERVICE_SECRET,

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

  database_name: requireEnv(DATABASE_NAME, 'DATABASE_NAME'),

  // E
  // F
  // G
  // H
  // I

  is_dev: IS_DEV === 'true',

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
      host: requireEnv(CACHE_HOST, 'CACHE_HOST'),
      port: requirePort(CACHE_PORT, 'CACHE_PORT'),
      password: requireEnv(CACHE_PASSWORD, 'CACHE_PASSWORD'),
      username: requireEnv(CACHE_USERNAME, 'CACHE_USERNAME'),
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

  // T
  // U
  // V
  // W
  // X
  // Y
  // Z
} as const;
