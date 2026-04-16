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
  // K
  // L
  // M
  mongo_uri: {
    prod: process.env.MONGODB_PROD_URI!,
    dev: process.env.MONGODB_DEV_URI!,
  },
  // N
  // O
  // P
  port: Number(process.env.PORT!),

  // Q
  // R
  // S
  // T
  // U
  url: {
    backend: {
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
