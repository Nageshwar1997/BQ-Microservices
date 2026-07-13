import { requireEnv, requirePort } from '@beautinique/shared-utils';

const {
  // A
  // B

  BULL_MQ_HOST,
  BULL_MQ_PORT,
  BULL_MQ_PASSWORD,
  BULL_MQ_USERNAME,

  // C
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,

  // D

  DATABASE_NAME,

  // E
  // F
  // G
  // H
  // I

  IS_DEV,

  // J
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

  cloudinary: {
    cloud_name: requireEnv(CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv(CLOUDINARY_API_KEY, 'CLOUDINARY_API_KEY'),
    api_secret: requireEnv(CLOUDINARY_API_SECRET, 'CLOUDINARY_API_SECRET'),
  },

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
    bull_mq: {
      host: requireEnv(BULL_MQ_HOST, 'BULL_MQ_HOST'),
      port: requirePort(BULL_MQ_PORT, 'BULL_MQ_PORT'),
      password: BULL_MQ_PASSWORD,
      username: BULL_MQ_USERNAME,
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
