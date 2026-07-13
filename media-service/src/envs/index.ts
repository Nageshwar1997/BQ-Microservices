const {
  // A
  // B

  BULL_MQ_HOST,
  BULL_MQ_PORT,
  BULL_MQ_PASSWORD,
  BULL_MQ_USERNAME,

  // C
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,

  // D

  DATABASE_NAME,

  // E
  // F
  // G
  // H
  // I
  // J
  // K
  // L
  // M

  MONGODB_URI,

  // N

  NODE_ENV,

  // O
  // P

  PORT,

  // Q
  // R
  // S

  SERVICE_NAME,

  SERVICE_SECRET,

  // T
  // U
  // V
  // W
  // X
  // Y
  // Z
} = process.env;

/** Fails fast at startup with a clear message instead of a confusing downstream crash. */
const requireEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const requirePort = (value: string | undefined, name: string): number => {
  const port = Number(requireEnv(value, name));

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      `Environment variable ${name} must be a positive integer, got: ${String(value)}`,
    );
  }

  return port;
};

export const envs = {
  // A
  // B
  // C

  cloudinary: {
    cloud_name: requireEnv(CLOUDINARY_CLOUD_NAME, 'CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv(CLOUDINARY_API_KEY, 'CLOUDINARY_API_KEY'),
    api_secret: requireEnv(CLOUDINARY_API_SECRET, 'CLOUDINARY_API_SECRET'),
  },

  // D

  database_name: requireEnv(DATABASE_NAME, 'DATABASE_NAME'),

  // E
  // F
  // G
  // H
  // I

  is_dev: NODE_ENV === 'development',

  // J
  // K
  // L
  // M

  mongo_uri: requireEnv(MONGODB_URI, 'MONGODB_URI'),

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
  service_secret: requireEnv(SERVICE_SECRET, 'SERVICE_SECRET'),

  // T
  // U
  // V
  // W
  // X
  // Y
  // Z
} as const;
