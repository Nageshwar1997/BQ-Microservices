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
