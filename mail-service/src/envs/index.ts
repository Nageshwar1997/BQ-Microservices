const {
  // A
  // B
  // C
  // D
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

  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,

  MAIL_SERVICE_DEV_URL,
  MAIL_SERVICE_PROD_URL,

  MEDIA_SERVICE_DEV_URL,
  MEDIA_SERVICE_PROD_URL,

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

  redis: {
    job: {
      host: JOB_REDIS_HOST,
      port: Number(JOB_REDIS_PORT),
      password: JOB_REDIS_PASSWORD,
      username: JOB_REDIS_USERNAME,
    },
  },

  // S

  service_name: SERVICE_NAME,

  // T
  // U

  url: {
    gateway: is_dev ? GATEWAY_DEV_URL : GATEWAY_PROD_URL,
    service: {
      mail: is_dev ? MAIL_SERVICE_DEV_URL : MAIL_SERVICE_PROD_URL,
      media: is_dev ? MEDIA_SERVICE_DEV_URL : MEDIA_SERVICE_PROD_URL,
      user: is_dev ? USER_SERVICE_DEV_URL : USER_SERVICE_PROD_URL,
    },
  },

  // V
  // W
  // X
  // Y
  // Z
} as const;
