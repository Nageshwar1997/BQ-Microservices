import { API_METHODS_MAP } from '@beautinique/backend-constants';

import { envs } from '../envs/index.js';

const { DELETE, GET, PATCH, POST } = API_METHODS_MAP;

export const LOGGER_BASE_OPTIONS = {
  level: envs.is_dev ? 'debug' : 'info',
  pretty: envs.is_dev,
} as const;

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
    },
  },
  user: {
    base: '/user',
    session: { method: GET, path: '/session' },
    update: { method: PATCH, path: '/' },
    password: {
      base: '/password',
      change: { method: PATCH, path: '/change' },
      set: { method: PATCH, path: '/set' },
    },
  },
  admin: {
    base: '/admin',
    territory: {
      base: '/territory',
      // Self - own Admin profile (states/status/load). No state param
      // needed, unlike `stateAdmins` below - lets "My Status" show the
      // current value before the admin changes it.
      me: { method: GET, path: '/me' },
      // MASTER assigns/reassigns which state(s) an ADMIN owns.
      assign: { method: POST, path: '/:adminId/assign' },
      // Self (ACTIVE/ON_LEAVE) or MASTER (also SUSPENDED) toggles status.
      status: { method: PATCH, path: '/:adminId/status' },
      // MASTER - full India state -> admins -> status -> load overview.
      map: { method: GET, path: '/map' },
      // Eligible admins for one state, ACTIVE-first (resolution + admin UI).
      stateAdmins: { method: GET, path: '/state/:state' },
    },
  },
} as const;
