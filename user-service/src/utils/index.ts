import type { IUser, IUserDoc, TId, TMinimalUser, TUser } from '@/types';
import type { TAuthProvider } from '@beautinique/be-constants';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';

/* ======================= Auth Utils ======================= */

export const createOAuthDbPayload = async (
  data: Record<string, string>,
  provider: TAuthProvider,
): Promise<TUser> => {
  const fullName = data.name?.trim() || '';
  const nameParts = fullName.split(/\s+/);

  const firstName = data.given_name || nameParts[0];
  const lastName =
    data.family_name || (nameParts.length > 1 ? nameParts?.slice(1)?.join(' ') : '') || '';

  const avatar = data.picture || data.avatar_url;

  return {
    email: data.email,
    firstName,
    lastName,
    avatar,
    password: '',
    phoneNumber: '',
    providers: [provider],
    role: 'USER',
    status: 'ACTIVE',
  };
};

export const getMinimalUser = (user: IUser | IUserDoc): TMinimalUser => {
  const {
    password: _,
    reason: __,
    status: ___,
    ...restUser
  } = 'toObject' in user ? user.toObject() : user;

  return restUser;
};

/* ======================= Auth Utils End ======================= */

/* ======================= User Utils Start ======================= */

export const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};
export const generateTempToken = (bytes = 32) => {
  return randomBytes(bytes).toString('hex');
};

export const toObjectId = (id: string): TId => new Types.ObjectId(id);

/* ======================= User Utils End ======================= */
