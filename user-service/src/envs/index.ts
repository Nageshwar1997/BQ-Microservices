import { requireEnv, requirePort } from '@beautinique/shared-utils';
const {
  // A
  // B
  // C

  CACHE_REDIS_HOST,
  CACHE_REDIS_PORT,
  CACHE_REDIS_PASSWORD,
  CACHE_REDIS_USERNAME,

  // D

  DATABASE_NAME,

  // E
  // F
  // G

  GATEWAY_DEV_URL,
  GATEWAY_PROD_URL,

  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_ENDPOINT,

  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_ENDPOINT,

  // H
  // I

  IS_DEV,

  // J

  JOB_REDIS_HOST,
  JOB_REDIS_PORT,
  JOB_REDIS_PASSWORD,
  JOB_REDIS_USERNAME,

  // K
  // L

  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_ENDPOINT,

  // M

  MAIL_SERVICE_DEV_URL,
  MAIL_SERVICE_PROD_URL,

  MEDIA_SERVICE_DEV_URL,
  MEDIA_SERVICE_PROD_URL,

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

  USER_SERVICE_DEV_URL,
  USER_SERVICE_PROD_URL,

  // V
  // W
  // X
  // Y
  // Z
} = process.env as Record<string, string>;

const is_dev = IS_DEV === 'true';

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
      redirect_endpoint: requireEnv(GITHUB_REDIRECT_ENDPOINT, 'GITHUB_REDIRECT_ENDPOINT'),
    },
    google: {
      client_id: requireEnv(GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
      client_secret: requireEnv(GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
      redirect_endpoint: requireEnv(GOOGLE_REDIRECT_ENDPOINT, 'GOOGLE_REDIRECT_ENDPOINT'),
    },
    linkedin: {
      client_id: requireEnv(LINKEDIN_CLIENT_ID, 'LINKEDIN_CLIENT_ID'),
      client_secret: requireEnv(LINKEDIN_CLIENT_SECRET, 'LINKEDIN_CLIENT_SECRET'),
      redirect_endpoint: requireEnv(LINKEDIN_REDIRECT_ENDPOINT, 'LINKEDIN_REDIRECT_ENDPOINT'),
    },
  },

  // P

  port: requirePort(PORT, 'PORT'),

  // Q
  // R

  redis: {
    cache: {
      host: requireEnv(CACHE_REDIS_HOST, 'CACHE_REDIS_HOST'),
      port: requirePort(CACHE_REDIS_PORT, 'CACHE_REDIS_PORT'),
      password: requireEnv(CACHE_REDIS_PASSWORD, 'CACHE_REDIS_PASSWORD'),
      username: requireEnv(CACHE_REDIS_USERNAME, 'CACHE_REDIS_USERNAME'),
    },
    job: {
      host: requireEnv(JOB_REDIS_HOST, 'JOB_REDIS_HOST'),
      port: requirePort(JOB_REDIS_PORT, 'JOB_REDIS_PORT'),
      password: requireEnv(JOB_REDIS_PASSWORD, 'JOB_REDIS_PASSWORD'),
      username: requireEnv(JOB_REDIS_USERNAME, 'JOB_REDIS_USERNAME'),
    },
  },

  // S

  service_name: requireEnv(SERVICE_NAME, 'SERVICE_NAME'),
  service_secret: requireEnv(SERVICE_SECRET, 'SERVICE_SECRET'),

  // T
  // U

  url: {
    gateway: is_dev
      ? requireEnv(GATEWAY_DEV_URL, 'GATEWAY_DEV_URL')
      : requireEnv(GATEWAY_PROD_URL, 'GATEWAY_PROD_URL'),
    service: {
      mail: is_dev
        ? requireEnv(MAIL_SERVICE_DEV_URL, 'MAIL_SERVICE_DEV_URL')
        : requireEnv(MAIL_SERVICE_PROD_URL, 'MAIL_SERVICE_PROD_URL'),
      media: is_dev
        ? requireEnv(MEDIA_SERVICE_DEV_URL, 'MEDIA_SERVICE_DEV_URL')
        : requireEnv(MEDIA_SERVICE_PROD_URL, 'MEDIA_SERVICE_PROD_URL'),
      user: is_dev
        ? requireEnv(USER_SERVICE_DEV_URL, 'USER_SERVICE_DEV_URL')
        : requireEnv(USER_SERVICE_PROD_URL, 'USER_SERVICE_PROD_URL'),
    },
  },

  // V
  // W
  // X
  // Y
  // Z
} as const;
