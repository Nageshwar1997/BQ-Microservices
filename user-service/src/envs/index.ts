const {
  // A

  ADMIN_DEV_URL,
  ADMIN_PROD_URL,

  // B

  GATEWAY_DEV_URL,
  GATEWAY_PROD_URL,

  // C

  CACHE_REDIS_HOST,
  CACHE_REDIS_PORT,
  CACHE_REDIS_PASSWORD,
  CACHE_REDIS_USERNAME,

  CLIENT_DEV_URL,
  CLIENT_PROD_URL,

  // D

  DATABASE_NAME,

  // E
  // F
  // G

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

  JWT_SECRET,

  // K
  // L

  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_ENDPOINT,

  // M

  MAIL_SERVICE_DEV_URL,
  MAIL_SERVICE_PROD_URL,

  MASTER_DEV_URL,
  MASTER_PROD_URL,

  MEDIA_SERVICE_DEV_URL,
  MEDIA_SERVICE_PROD_URL,

  MONGODB_PROD_URI,
  MONGODB_DEV_URI,

  // N
  // O
  // P

  PORT,

  PUBLIC_DEV_URL_1,
  PUBLIC_DEV_URL_2,

  // Q

  QUEUE_REDIS_HOST,
  QUEUE_REDIS_PORT,
  QUEUE_REDIS_PASSWORD,
  QUEUE_REDIS_USERNAME,

  // R
  // S

  SERVICE_NAME,

  // T
  // U

  USER_SERVICE_DEV_URL,
  USER_SERVICE_PROD_URL,

  // V
  // W

  WORKER_SERVICE_DEV_URL,
  WORKER_SERVICE_PROD_URL,

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

  jwt_secret: JWT_SECRET,

  // K
  // L
  // M

  mongo_uri: is_dev ? MONGODB_DEV_URI : MONGODB_PROD_URI,

  // N
  // O

  oAuth: {
    github: {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      redirect_endpoint: GITHUB_REDIRECT_ENDPOINT,
    },
    google: {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_endpoint: GOOGLE_REDIRECT_ENDPOINT,
    },
    linkedin: {
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
      redirect_endpoint: LINKEDIN_REDIRECT_ENDPOINT,
    },
  },

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
    queue: {
      host: QUEUE_REDIS_HOST,
      port: Number(QUEUE_REDIS_PORT),
      password: QUEUE_REDIS_PASSWORD,
      username: QUEUE_REDIS_USERNAME,
    },
  },

  // S

  service_name: SERVICE_NAME,

  // T
  // U

  url: {
    frontend: {
      client: is_dev ? CLIENT_DEV_URL : CLIENT_PROD_URL,
      admin: is_dev ? ADMIN_DEV_URL : ADMIN_PROD_URL,
      master: is_dev ? MASTER_DEV_URL : MASTER_PROD_URL,
      public1: PUBLIC_DEV_URL_1,
      public2: PUBLIC_DEV_URL_2,
    },
    gateway: is_dev ? GATEWAY_DEV_URL : GATEWAY_PROD_URL,
    service: {
      mail: is_dev ? MAIL_SERVICE_DEV_URL : MAIL_SERVICE_PROD_URL,
      media: is_dev ? MEDIA_SERVICE_DEV_URL : MEDIA_SERVICE_PROD_URL,
      user: is_dev ? USER_SERVICE_DEV_URL : USER_SERVICE_PROD_URL,
      worker: is_dev ? WORKER_SERVICE_DEV_URL : WORKER_SERVICE_PROD_URL,
    },
  },

  // V
  // W
  // X
  // Y
  // Z
} as const;
