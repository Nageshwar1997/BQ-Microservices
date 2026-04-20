import { envs } from '@/envs';
import type { ConnectionOptions } from 'bullmq';

export const ORIGINS = [
  envs.url.frontend.client,
  envs.url.frontend.admin,
  envs.url.frontend.master,
  envs.url.frontend.public1,
  envs.url.frontend.public2,
];

export const WORKER_CONFIGS: ConnectionOptions = {
  host: envs.redis.worker.host,
  port: envs.redis.worker.port,
  password: envs.redis.worker.password,
};

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
} as const;

export const API_ROUTES_AND_METHODS = {
  mail: {
    sendOtp: { url: '/send-otp', method: 'POST' },
  },
};
