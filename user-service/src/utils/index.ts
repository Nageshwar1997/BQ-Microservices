import { UnprocessableEntityError } from '@beautinique/backend-classes';
import { USER_ROLE_MAP } from '@beautinique/shared-constants';
import type { TAuthProvider } from '@beautinique/shared-types';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';

import type { IUser, TId } from '../types/index.js';

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

/* ========== OBJECT ID CONVERTER FUNCTION ========== */

export const toObjectId = (id: string): TId => {
  if (!Types.ObjectId.isValid(id)) {
    throw new UnprocessableEntityError('Invalid object id');
  }

  return new Types.ObjectId(id);
};

export const getObjId = (id: string | TId): TId => {
  return typeof id === 'string' ? toObjectId(id) : id;
};

/* ======================= User Utils End ======================= */
