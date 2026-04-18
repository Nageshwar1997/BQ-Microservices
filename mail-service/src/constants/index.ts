import { envs } from '@/envs';

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
    },
    password: {
      base: '/password',
    },
  },
  user: {
    base: '/users',
  },
} as const;
