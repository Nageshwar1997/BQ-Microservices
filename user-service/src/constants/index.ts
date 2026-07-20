import { API_METHODS_MAP } from '@beautinique/shared-constants';

import { envs } from '../envs/index.js';

const { DELETE, GET, PATCH, POST } = API_METHODS_MAP;

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const USER_STATUS = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;

export const USER_STATUS_MAP = Object.fromEntries(
  USER_STATUS.map((status) => [status, status]),
) as {
  readonly [K in (typeof USER_STATUS)[number]]: K;
};

export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const OAUTH_API_ROUTES_AND_METHODS = {
  google: {
    decode: { method: GET, baseURL: 'https://www.googleapis.com', url: '/oauth2/v2/userinfo' },
  },
  linkedin: {
    access_token: {
      method: POST,
      baseURL: 'https://www.linkedin.com',
      url: '/oauth/v2/accessToken',
    },
    decode: { method: GET, baseURL: 'https://api.linkedin.com', url: '/v2/userinfo' },
  },
  github: {
    access_token: { method: POST, baseURL: 'https://github.com', url: '/login/oauth/access_token' },
    decode_profile: { method: GET, baseURL: 'https://api.github.com', url: '/user' },
    decode_emails: { method: GET, baseURL: 'https://api.github.com', url: '/user/emails' },
  },
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: GET, path: '/' },
  health: { method: GET, path: '/health' },
  wakeUp: { method: GET, path: '/wake-up' },
  auth: {
    base: '/auth',
    login: {
      base: '/login',
      manual: { method: POST, path: '/manual' },
      oauth: {
        google: {
          redirect: { method: GET, path: '/oauth/google/redirect' },
          callback: { method: GET, path: '/oauth/google/callback' },
        },

        linkedin: {
          redirect: { method: GET, path: '/oauth/linkedin/redirect' },
          callback: { method: GET, path: '/oauth/linkedin/callback' },
        },

        github: {
          redirect: { method: GET, path: '/oauth/github/redirect' },
          callback: { method: GET, path: '/oauth/github/callback' },
        },
      },
    },
    logout: { method: DELETE, path: '/logout' },
    register: {
      base: '/register',
      sendOtp: { method: POST, path: '/send-otp' },
      resendOtp: { method: PATCH, path: '/resend-otp' },
      verifyOtp: { method: POST, path: '/verify-otp' },
      saveUser: { method: POST, path: '/save-user' },
    },
    password: {
      base: '/password',
      forgot: {
        sendOtp: { method: POST, path: '/forgot-send-otp' },
        resendOtp: { method: PATCH, path: '/forgot-resend-otp' },
        verifyOtp: { method: POST, path: '/forgot-verify-otp' },
        save: { method: POST, path: '/forgot-save' },
      },
      change: { method: PATCH, path: '/change' },
      set: { method: PATCH, path: '/set' },
    },
  },
  user: {
    base: '/user',
    session: { method: GET, path: '/session' },
  },
} as const;
