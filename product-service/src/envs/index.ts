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

  PRODUCT_SERVICE_DEV_URL,
  PRODUCT_SERVICE_PROD_URL,

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

  database_name: DATABASE_NAME,

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

  mongo_uri: MONGODB_URI,

  // N
  // O
  // P

  port: Number(PORT),

  // Q
  // R

  redis: {
    cache: {
      host: CACHE_REDIS_HOST,
      port: Number(CACHE_REDIS_PORT),
      password: CACHE_REDIS_PASSWORD,
      username: CACHE_REDIS_USERNAME,
    },
    job: {
      host: JOB_REDIS_HOST,
      port: Number(JOB_REDIS_PORT),
      password: JOB_REDIS_PASSWORD,
      username: JOB_REDIS_USERNAME,
    },
  },

  // S

  service_name: SERVICE_NAME,
  service_secret: SERVICE_SECRET,

  // T
  // U

  url: {
    gateway: is_dev ? GATEWAY_DEV_URL : GATEWAY_PROD_URL,
    service: {
      mail: is_dev ? MAIL_SERVICE_DEV_URL : MAIL_SERVICE_PROD_URL,
      media: is_dev ? MEDIA_SERVICE_DEV_URL : MEDIA_SERVICE_PROD_URL,
      product: is_dev ? PRODUCT_SERVICE_DEV_URL : PRODUCT_SERVICE_PROD_URL,
      user: is_dev ? USER_SERVICE_DEV_URL : USER_SERVICE_PROD_URL,
    },
  },

  // V
  // W
  // X
  // Y
  // Z
} as const;
