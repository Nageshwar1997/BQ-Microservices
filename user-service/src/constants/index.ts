import { envs } from '@/envs';
import type { ConnectionOptions } from 'bullmq';

export const ORIGINS = Object.values(envs.url.frontend);

export const USER_STATUS = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const API_ROUTES_AND_METHODS = {
  oAuth: {
    google: {
      decode: { method: 'GET', baseURL: 'https://www.googleapis.com', url: '/oauth2/v2/userinfo' },
    },
    linkedin: {
      access_token: {
        method: 'POST',
        baseURL: 'https://www.linkedin.com',
        url: '/oauth/v2/accessToken',
      },
    },
    github: {
      access_token: {
        method: 'POST',
        baseURL: 'https://github.com',
        url: '/login/oauth/access_token',
      },
      decode_profile: { method: 'GET', baseURL: 'https://api.github.com', url: '/user' },
      decode_emails: { method: 'GET', baseURL: 'https://api.github.com', url: '/user/emails' },
    },
  },
};

export const GATEWAY_METHODS_AND_PATHS = {
  auth: {
    base: '/auth',
    login: {
      base: '/login',
      manual: { path: '/manual', method: 'post' },

      oauth: {
        google: {
          redirect: { path: '/oauth/google/redirect', method: 'get' },
          callback: { path: '/oauth/google/callback', method: 'get' },
        },

        linkedin: {
          redirect: { path: '/oauth/linkedin/redirect', method: 'get' },
          callback: { path: '/oauth/linkedin/callback', method: 'get' },
        },

        github: {
          redirect: { path: '/oauth/github/redirect', method: 'get' },
          callback: { path: '/oauth/github/callback', method: 'get' },
        },
      },
    },
    logout: {
      base: '/logout',
      default: { path: '/:userId', method: 'delete' },
    },
    register: {
      base: '/register',
      sendOtp: { path: '/send-otp', method: 'post' },
      resendOtp: { path: '/resend-otp', method: 'patch' },
    },
    password: {
      base: '/password',
    },
  },
  user: {
    base: '/users',
  },
} as const;

export const QUEUE_CONFIGS: ConnectionOptions = envs.redis.queue;

export const QUEUE_AND_JOB_NAMES = {
  'email-queue': ['send-otp'],
} as const;
