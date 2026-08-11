import { UnprocessableEntityError } from '@beautinique/backend-classes';
import {
  AUTH_PROVIDER_MAP,
  SERVICE_NAMES_MAP,
  USER_ROLE_MAP,
} from '@beautinique/backend-constants';
import type { TAuthProvider } from '@beautinique/backend-types';
import { randomBytes } from 'crypto';

import { METHODS_AND_PATHS } from '../constants/index.js';
import { envs } from '../envs/index.js';
import type {
  IGithubProfile,
  IGoogleProfile,
  ILinkedinProfile,
  IUser,
  TSocialAuthProvider,
} from '../types/index.js';

/* ======================= Auth Utils ======================= */

export const createOAuthDbPayload = (
  data: IGoogleProfile | ILinkedinProfile | IGithubProfile,
  provider: TAuthProvider,
): Omit<IUser, '_id' | 'createdAt' | 'updatedAt'> => {
  const fullName = data.name.trim();
  const nameParts = fullName.split(/\s+/);

  const firstName = 'given_name' in data ? data.given_name : (nameParts[0] ?? '');
  const lastName =
    'family_name' in data
      ? data.family_name
      : nameParts.length > 1
        ? nameParts.slice(1).join(' ')
        : '';
  const avatar = 'picture' in data ? data.picture : 'avatar_url' in data ? data.avatar_url : '';

  return {
    email: data.email,
    firstName,
    lastName,
    avatar,
    password: '',
    phoneNumber: '',
    providers: [provider],
    role: USER_ROLE_MAP.USER,
    status: 'ACTIVE',
  };
};

export const getMinimalUser = (user: IUser) => {
  return {
    _id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    avatar: user.avatar,
    role: user.role,
    providers: user.providers,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/* ======================= Auth Utils End ======================= */

/* ======================= User Utils Start ======================= */

export const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

export const generateTempToken = (bytes = 32) => {
  return randomBytes(bytes).toString('hex');
};

/* ======================= User Utils End ======================= */

export const getSocialAuthRedirectURL = (provider: TSocialAuthProvider) => {
  const { base, auth } = METHODS_AND_PATHS;
  const { base: auth_base, login } = auth;
  const { base: login_base, oauth } = login;
  const { github, google, linkedin } = oauth;

  const prefix = `${base}/${SERVICE_NAMES_MAP['user-service']}${auth_base}${login_base}` as const;

  const redirectMap = {
    [AUTH_PROVIDER_MAP.GOOGLE]: `${prefix}${google.callback.path}`,
    [AUTH_PROVIDER_MAP.LINKEDIN]: `${prefix}${linkedin.callback.path}`,
    [AUTH_PROVIDER_MAP.GITHUB]: `${prefix}${github.callback.path}`,
  } as const;

  return `${envs.gateway_url}${redirectMap[provider]}`;
};

export const getCloudinaryPublicIdFromUrl = (url: string): string => {
  try {
    const { pathname } = new URL(url);

    const match = /\/upload\/(?:[^/]+\/)*(?:v\d+\/)?(.+)$/.exec(pathname);

    if (!match?.[1]) {
      throw new UnprocessableEntityError('Invalid URL.');
    }

    return match[1].replace(/\.[^/.]+$/, '');
  } catch {
    throw new UnprocessableEntityError('Invalid URL.');
  }
};
