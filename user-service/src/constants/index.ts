import { API_METHODS_MAP } from '@beautinique/shared-constants';

import { envs } from '../envs/index.js';

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

export const HEADERS_KEYS = {
  authorization: 'Authorization',
  contentType: 'Content-Type',
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
  loginRole: 'X-Login-Role',
} as const;

export const USER_STATUS = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export const SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const OAUTH_API_ROUTES_AND_METHODS = {
  google: {
    decode: {
      method: API_METHODS_MAP.GET,
      baseURL: 'https://www.googleapis.com',
      url: '/oauth2/v2/userinfo',
    },
  },
  linkedin: {
    access_token: {
      method: API_METHODS_MAP.POST,
      baseURL: 'https://www.linkedin.com',
      url: '/oauth/v2/accessToken',
    },
    decode: {
      method: API_METHODS_MAP.GET,
      baseURL: 'https://api.linkedin.com',
      url: '/v2/userinfo',
    },
  },
  github: {
    access_token: {
      method: API_METHODS_MAP.POST,
      baseURL: 'https://github.com',
      url: '/login/oauth/access_token',
    },
    decode_profile: {
      method: API_METHODS_MAP.GET,
      baseURL: 'https://api.github.com',
      url: '/user',
    },
    decode_emails: {
      method: API_METHODS_MAP.GET,
      baseURL: 'https://api.github.com',
      url: '/user/emails',
    },
  },
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: API_METHODS_MAP.GET, path: '/' },
  health: { method: API_METHODS_MAP.GET, path: '/health' },
  auth: {
    base: '/auth',
    login: {
      base: '/login',
      manual: { method: API_METHODS_MAP.POST, path: '/manual' },
      oauth: {
        google: {
          redirect: { method: API_METHODS_MAP.GET, path: '/oauth/google/redirect' },
          callback: { method: API_METHODS_MAP.GET, path: '/oauth/google/callback' },
        },

        linkedin: {
          redirect: { method: API_METHODS_MAP.GET, path: '/oauth/linkedin/redirect' },
          callback: { method: API_METHODS_MAP.GET, path: '/oauth/linkedin/callback' },
        },

        github: {
          redirect: { method: API_METHODS_MAP.GET, path: '/oauth/github/redirect' },
          callback: { method: API_METHODS_MAP.GET, path: '/oauth/github/callback' },
        },
      },
    },
    logout: { method: API_METHODS_MAP.DELETE, path: '/logout' },
    register: {
      base: '/register',
      sendOtp: { method: API_METHODS_MAP.POST, path: '/send-otp' },
      resendOtp: { method: API_METHODS_MAP.PATCH, path: '/resend-otp' },
      verifyOtp: { method: API_METHODS_MAP.POST, path: '/verify-otp' },
      saveUser: { method: API_METHODS_MAP.POST, path: '/save-user' },
    },
    password: {
      base: '/password',
      forgot: {
        sendOtp: { method: API_METHODS_MAP.POST, path: '/forgot-send-otp' },
        resendOtp: { method: API_METHODS_MAP.PATCH, path: '/forgot-resend-otp' },
        verifyOtp: { method: API_METHODS_MAP.POST, path: '/forgot-verify-otp' },
        save: { method: API_METHODS_MAP.POST, path: '/forgot-save' },
      },
      change: { method: API_METHODS_MAP.PATCH, path: '/change' },
      set: { method: API_METHODS_MAP.PATCH, path: '/set' },
    },
  },
  user: {
    base: '/user',
    session: { method: API_METHODS_MAP.GET, path: '/session' },
  },
} as const;
