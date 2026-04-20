const {
  // A
  // B
  BACKEND_DEV_URL,
  BACKEND_PROD_URL,
  // C
  // D
  // E
  // F
  FRONTEND_DEV_CLIENT_URL,
  FRONTEND_DEV_ADMIN_URL,
  FRONTEND_DEV_MASTER_URL,
  FRONTEND_DEV_PUBLIC_URL_1,
  FRONTEND_DEV_PUBLIC_URL_2,

  FRONTEND_PROD_CLIENT_URL,
  FRONTEND_PROD_ADMIN_URL,
  FRONTEND_PROD_MASTER_URL,
  // G
  // H
  // I
  IS_DEV,
  // J
  // K
  // L
  // M
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,

  MAIL_SERVICE_DEV_URL,
  MAIL_SERVICE_PROD_URL,
  // N
  // O
  // P
  PORT,
  // Q
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
  mail: {
    host: MAIL_HOST,
    port: Number(MAIL_PORT),
    user: MAIL_USER,
    pass: MAIL_PASS,
    from: MAIL_FROM,
  },
  // N
  // O
  // P
  port: Number(PORT),
  // Q
  // R
  // S
  service_name: SERVICE_NAME,
  // T
  // U
  url: {
    gateway: is_dev ? BACKEND_DEV_URL : BACKEND_PROD_URL,
    service: {
      mail: is_dev ? MAIL_SERVICE_DEV_URL : MAIL_SERVICE_PROD_URL,
      user: is_dev ? USER_SERVICE_DEV_URL : USER_SERVICE_PROD_URL,
      worker: is_dev ? WORKER_SERVICE_DEV_URL : WORKER_SERVICE_PROD_URL,
    },
    frontend: {
      client: is_dev ? FRONTEND_DEV_CLIENT_URL : FRONTEND_PROD_CLIENT_URL,
      admin: is_dev ? FRONTEND_DEV_ADMIN_URL : FRONTEND_PROD_ADMIN_URL,
      master: is_dev ? FRONTEND_DEV_MASTER_URL : FRONTEND_PROD_MASTER_URL,
      public1: FRONTEND_DEV_PUBLIC_URL_1,
      public2: FRONTEND_DEV_PUBLIC_URL_2,
    },
  },
  // V
  // W
  // X
  // Y
  // Z
} as const;
