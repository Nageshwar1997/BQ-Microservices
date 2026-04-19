import { envs } from '@/envs';
import type { ConnectionOptions } from 'bullmq';

export const ORIGINS = [
  envs.url.frontend.prod.client,
  envs.url.frontend.prod.admin,
  envs.url.frontend.prod.master,
  envs.url.frontend.dev.client,
  envs.url.frontend.dev.admin,
  envs.url.frontend.dev.master,
  envs.url.frontend.dev.public1,
  envs.url.frontend.dev.public2,
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
