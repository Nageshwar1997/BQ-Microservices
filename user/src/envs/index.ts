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
  is_dev: process.env.IS_DEV! === "true",

  // J
  // K
  // L
  // M
  // N
  // O
  // P
  port: process.env.PORT!,

  // Q
  // R
  // S
  // T
  // U
  url: {
    backend: {
      dev: process.env.BACKEND_LOCALHOST_URL!,
      prod: process.env.BACKEND_PRODUCTION_URL!,
    },
    frontend: {
      dev: {
        client: process.env.FRONTEND_LOCAL_HOST_CLIENT_URL!,
        admin: process.env.FRONTEND_LOCAL_HOST_ADMIN_URL!,
        master: process.env.FRONTEND_LOCAL_HOST_MASTER_URL!,
        public1: process.env.FRONTEND_LOCAL_HOST_PUBLIC_URL_1!,
        public2: process.env.FRONTEND_LOCAL_HOST_PUBLIC_URL_2!,
      },
      prod: {
        client: process.env.FRONTEND_PRODUCTION_CLIENT_URL!,
        admin: process.env.FRONTEND_PRODUCTION_ADMIN_URL!,
        master: process.env.FRONTEND_PRODUCTION_MASTER_URL!,
      },
    },
  },

  // V
  // W
  // X
  // Y
  // Z
};
