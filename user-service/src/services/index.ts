import { AppError } from '@beautinique/be-classes';

import { User } from '../models/index.js';
import type { IUser, TId } from '../types/index.js';
import { getObjId } from '../utils/index.js';

interface ILean {
  lean?: boolean;
}
interface IById extends ILean {
  id: string | TId;
  password?: boolean;
}

type TEmail = Pick<IUser, 'email'>;
type TPhone = Pick<IUser, 'phoneNumber'>;

type TByEmail = TEmail & ILean;
type TByPhone = TPhone & ILean;
type TByEmailOrPhone = Partial<TPhone | TEmail> & ILean;

export const getUserById = async (data: IById) => {
  const { id, lean = true, password = false } = data;
  const _id = getObjId(id);
  const baseQuery = User.findById(_id);
  const query = password ? baseQuery : baseQuery.select('-password');

  const user = await (lean ? query.lean() : query);

  if (!user) throw new AppError({ message: 'User not found', code: 'NOT_FOUND' });

  return user;
};

export const getUserByEmail = async (data: TByEmail) => {
  const { lean = true, email } = data;
  const query = User.findOne({ email });
  return await (lean ? query.lean() : query);
};

export const getUserByPhoneNumber = async (data: TByPhone) => {
  const { lean = true, phoneNumber } = data;
  const query = User.findOne({ phoneNumber });
  return await (lean ? query.lean() : query);
};

export const getUserByEmailOrPhone = async ({ lean = true, ...data }: TByEmailOrPhone) => {
  const conditions: Record<keyof typeof data, string>[] = [];

  if ('email' in data && data.email) conditions.push({ email: data.email });
  if ('phoneNumber' in data && data.phoneNumber) conditions.push({ phoneNumber: data.phoneNumber });

  const query = { $or: conditions };

  const user = lean ? await User.findOne(query).lean() : await User.findOne(query);

  if (!user) {
    throw new AppError({
      message: 'User not found',
      code: 'NOT_FOUND',
      fieldErrors: {
        ...('email' in data && data.email && { email: ['Invalid email'] }),
        ...('phoneNumber' in data && data.phoneNumber && { phoneNumber: ['Invalid phone number'] }),
      },
    });
  }

  return user;
};

export const createNewUser = async (
  payload: Omit<IUser, '_id' | 'createdAt' | 'updatedAt' | 'reason'>,
) => {
  const user = await User.create(payload);

  return user;
};

export const updateUser = async (
  filter: Partial<Pick<IUser, '_id' | 'email' | 'phoneNumber' | 'status' | 'role'>>,
  payload: Partial<IUser>,
) => {
  const user = await User.findOneAndUpdate(filter, payload, { new: true });

  if (!user) {
    throw new AppError({ message: 'User not found!', code: 'NOT_FOUND' });
  }

  return user;
};
