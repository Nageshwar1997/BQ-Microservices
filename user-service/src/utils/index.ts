import type { TAuthProvider } from '@beautinique/backend-types';
import { AUTH_PROVIDER_MAP, USER_ROLE_MAP } from '@beautinique/shared-constants';
import { randomBytes } from 'crypto';

import { envs } from '../envs/index.js';
import type { IUser, TSocialAuthProvider } from '../types/index.js';

/* ======================= Auth Utils ======================= */

export const createOAuthDbPayload = (
  data: Record<string, string>,
  provider: TAuthProvider,
): Omit<IUser, '_id' | 'createdAt' | 'updatedAt'> => {
  const fullName = data.name?.trim() ?? '';
  const nameParts = fullName.split(/\s+/);

  const firstName = data.given_name ?? nameParts[0] ?? '';
  const lastName =
    (data.family_name ?? (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '')) || '';

  const avatar = data.picture ?? data.avatar_url ?? '';

  return {
    email: data.email ?? '',
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
  const redirectMap: Record<TSocialAuthProvider, string> = {
    [AUTH_PROVIDER_MAP.GOOGLE]: envs.oAuth.google.redirect_endpoint,
    [AUTH_PROVIDER_MAP.LINKEDIN]: envs.oAuth.linkedin.redirect_endpoint,
    [AUTH_PROVIDER_MAP.GITHUB]: envs.oAuth.github.redirect_endpoint,
  };

  return `${envs.gateway_url}${redirectMap[provider]}`;
};
