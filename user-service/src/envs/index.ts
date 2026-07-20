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

  GATEWAY_BASE_URL,

  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,

  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,

  // H
  // I
  // J

  BULL_MQ_HOST,
  BULL_MQ_PORT,
  BULL_MQ_PASSWORD,
  BULL_MQ_USERNAME,

  // K
  // L

  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,

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

  oAuth: {
    github: {
      client_id: requireEnv(GITHUB_CLIENT_ID, 'GITHUB_CLIENT_ID'),
      client_secret: requireEnv(GITHUB_CLIENT_SECRET, 'GITHUB_CLIENT_SECRET'),
    },
    google: {
      client_id: requireEnv(GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
      client_secret: requireEnv(GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
    },
    linkedin: {
      client_id: requireEnv(LINKEDIN_CLIENT_ID, 'LINKEDIN_CLIENT_ID'),
      client_secret: requireEnv(LINKEDIN_CLIENT_SECRET, 'LINKEDIN_CLIENT_SECRET'),
    },
  },

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

  // T
  // U

  gateway_url: requireEnv(GATEWAY_BASE_URL, 'GATEWAY_BASE_URL'),

  // V
  // W
  // X
  // Y
  // Z
} as const;
