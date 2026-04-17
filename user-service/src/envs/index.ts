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
  is_dev: process.env.IS_DEV! === 'true',

  // J
  jwt_secret: process.env.JWT_SECRET!,

  // K
  // L
  // M
  mongo_uri: {
    prod: process.env.MONGODB_PROD_URI!,
    dev: process.env.MONGODB_DEV_URI!,
  },

  // N
  // O
  oAuth: {
    google: {
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_endpoint: process.env.GOOGLE_REDIRECT_ENDPOINT!,
    },
    github: {
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      redirect_endpoint: process.env.GITHUB_REDIRECT_ENDPOINT!,
    },
    linkedin: {
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      redirect_endpoint: process.env.LINKEDIN_REDIRECT_ENDPOINT!,
    },
  },

  // P
  port: Number(process.env.PORT!),

  // Q
  // R
  redis: {
    host: process.env.REDIS_HOST!,
    port: process.env.REDIS_PORT!,
    password: process.env.REDIS_PASSWORD!,
    username: process.env.REDIS_USERNAME!,
  },

  // S
  // T
  // U
  url: {
    gateway: {
      dev: process.env.BACKEND_DEV_URL!,
      prod: process.env.BACKEND_PROD_URL!,
    },
    frontend: {
      dev: {
        client: process.env.FRONTEND_DEV_CLIENT_URL!,
        admin: process.env.FRONTEND_DEV_ADMIN_URL!,
        master: process.env.FRONTEND_DEV_MASTER_URL!,
        public1: process.env.FRONTEND_DEV_PUBLIC_URL_1!,
        public2: process.env.FRONTEND_DEV_PUBLIC_URL_2!,
      },
      prod: {
        client: process.env.FRONTEND_PROD_CLIENT_URL!,
        admin: process.env.FRONTEND_PROD_ADMIN_URL!,
        master: process.env.FRONTEND_PROD_MASTER_URL!,
      },
    },
  },

  // V
  // W
  // X
  // Y
  // Z
};
