const {
  // A
  // B
  BACKEND_DEV_URL,
  BACKEND_PROD_URL,
  // C
  CACHING_REDIS_HOST,
  CACHING_REDIS_PORT,
  CACHING_REDIS_PASSWORD,
  CACHING_REDIS_USERNAME,
  // D
  DATABASE_NAME,
  // E
  // F
  FRONTEND_DEV_ADMIN_URL,
  FRONTEND_DEV_CLIENT_URL,
  FRONTEND_DEV_MASTER_URL,
  FRONTEND_DEV_PUBLIC_URL_1,
  FRONTEND_DEV_PUBLIC_URL_2,
  FRONTEND_PROD_ADMIN_URL,
  FRONTEND_PROD_CLIENT_URL,
  FRONTEND_PROD_MASTER_URL,
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
  MONGODB_PROD_URI,
  MONGODB_DEV_URI,
  // N
  // O
  // P
  PORT,
  // Q
  QUEUING_REDIS_HOST,
  QUEUING_REDIS_PORT,
  QUEUING_REDIS_PASSWORD,
  QUEUING_REDIS_USERNAME,
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
    caching: {
      host: CACHING_REDIS_HOST,
      port: Number(CACHING_REDIS_PORT),
      password: CACHING_REDIS_PASSWORD,
      username: CACHING_REDIS_USERNAME,
    },
    queuing: {
      host: QUEUING_REDIS_HOST,
      port: Number(QUEUING_REDIS_PORT),
      password: QUEUING_REDIS_PASSWORD,
      username: QUEUING_REDIS_USERNAME,
    },
  },

  // S
  service_name: SERVICE_NAME,
  // T
  // U
  url: {
    frontend: {
      client: is_dev ? FRONTEND_DEV_CLIENT_URL : FRONTEND_PROD_CLIENT_URL,
      admin: is_dev ? FRONTEND_DEV_ADMIN_URL : FRONTEND_PROD_ADMIN_URL,
      master: is_dev ? FRONTEND_DEV_MASTER_URL : FRONTEND_PROD_MASTER_URL,
      public1: FRONTEND_DEV_PUBLIC_URL_1,
      public2: FRONTEND_DEV_PUBLIC_URL_2,
    },
    gateway: is_dev ? BACKEND_DEV_URL : BACKEND_PROD_URL,
  },

  // V
  // W
  // X
  // Y
  // Z
} as const;
