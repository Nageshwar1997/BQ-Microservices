export const envs = {
  // A
  // B
  // C
  // D
  // E
  // F
  // G
  // H
  // I
  is_dev: (process.env.IS_DEV as string) === 'true',

  // J
  jwt_secret: process.env.JWT_SECRET as string,

  // K
  // L
  // M
  mongo_uri: {
    prod: process.env.MONGODB_PROD_URI as string,
    dev: process.env.MONGODB_DEV_URI as string,
  },

  // N
  // O
  oAuth: {
    google: {
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_endpoint: process.env.GOOGLE_REDIRECT_ENDPOINT as string,
    },
    github: {
      client_id: process.env.GITHUB_CLIENT_ID as string,
      client_secret: process.env.GITHUB_CLIENT_SECRET as string,
      redirect_endpoint: process.env.GITHUB_REDIRECT_ENDPOINT as string,
    },
    linkedin: {
      client_id: process.env.LINKEDIN_CLIENT_ID as string,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET as string,
      redirect_endpoint: process.env.LINKEDIN_REDIRECT_ENDPOINT as string,
    },
  },

  // P
  port: Number(process.env.PORT as string),

  // Q
  // R
  redis: {
    caching: {
      host: process.env.CACHING_REDIS_HOST as string,
      port: process.env.CACHING_REDIS_PORT as string,
      password: process.env.CACHING_REDIS_PASSWORD as string,
      username: process.env.CACHING_REDIS_USERNAME as string,
    },
    queuing: {
      host: process.env.QUEUING_REDIS_HOST as string,
      port: process.env.QUEUING_REDIS_PORT as string,
      password: process.env.QUEUING_REDIS_PASSWORD as string,
      username: process.env.QUEUING_REDIS_USERNAME as string,
    },
  },

  // S
  // T
  // U
  url: {
    gateway: {
      dev: process.env.BACKEND_DEV_URL as string,
      prod: process.env.BACKEND_PROD_URL as string,
    },
    frontend: {
      dev: {
        client: process.env.FRONTEND_DEV_CLIENT_URL as string,
        admin: process.env.FRONTEND_DEV_ADMIN_URL as string,
        master: process.env.FRONTEND_DEV_MASTER_URL as string,
        public1: process.env.FRONTEND_DEV_PUBLIC_URL_1 as string,
        public2: process.env.FRONTEND_DEV_PUBLIC_URL_2 as string,
      },
      prod: {
        client: process.env.FRONTEND_PROD_CLIENT_URL as string,
        admin: process.env.FRONTEND_PROD_ADMIN_URL as string,
        master: process.env.FRONTEND_PROD_MASTER_URL as string,
      },
    },
  },

  // V
  // W
  // X
  // Y
  // Z
};
