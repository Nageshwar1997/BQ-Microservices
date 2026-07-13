import { requireEnv, requirePort } from '@beautinique/shared-utils';

const {
  // A
  // B

  BULL_MQ_HOST,
  BULL_MQ_PORT,
  BULL_MQ_PASSWORD,
  BULL_MQ_USERNAME,

  // C
  // D
  // E
  // F
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
  // V
  // W
  // X
  // Y
  // Z
} = process.env;

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

  is_dev: IS_DEV === 'true',

  // J
  // K
  // L
  // M

  mail: {
    host: requireEnv(MAIL_HOST, 'MAIL_HOST'),
    port: requirePort(MAIL_PORT, 'MAIL_PORT'),
    user: requireEnv(MAIL_USER, 'MAIL_USER'),
    pass: requireEnv(MAIL_PASS, 'MAIL_PASS'),
    from: requireEnv(MAIL_FROM, 'MAIL_FROM'),
  },

  // N
  // O
  // P

  port: requirePort(PORT, 'PORT'),

  // Q
  // R

  redis: {
    bull_mq: {
      host: requireEnv(BULL_MQ_HOST, 'BULL_MQ_HOST'),
      port: requirePort(BULL_MQ_PORT, 'BULL_MQ_PORT'),
      password: BULL_MQ_PASSWORD,
      username: BULL_MQ_USERNAME,
    },
  },

  // S

  service_name: requireEnv(SERVICE_NAME, 'SERVICE_NAME'),

  // T
  // U
  // V
  // W
  // X
  // Y
  // Z
} as const;
