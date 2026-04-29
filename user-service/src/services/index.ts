import { User } from '@/models';
import type { IUser, IUserDoc, TId, TUser } from '@/types';
import { toObjectId } from '@/utils';
import { AppError } from '@beautinique/be-classes';

interface ILean {
  lean?: boolean;
}
interface IById extends ILean {
  id: string | TId;
  password?: boolean;
}
type TByEmail = Pick<IUser, 'email'> & ILean;
type TByPhone = Pick<IUser, 'phoneNumber'> & ILean;
type TByEmailOrPhone = TByEmail | TByPhone;

export const getUserById = async (data: IById): Promise<IUser | IUserDoc> => {
  const { id, lean = true, password = false } = data;
  const _id = typeof id === 'string' ? toObjectId(id) : id;
  const baseQuery = User.findById(_id);
  const query = !password ? baseQuery.select('-password') : baseQuery;

  const user = await (lean ? query.lean() : query);
  if (!user) {
    throw new AppError({ message: 'User not found', statusCode: 404, code: 'NOT_FOUND' });
  }

  return user;
};

export const getUserByEmail = async (data: TByEmail): Promise<IUser | IUserDoc | null> => {
  const { lean = true, email } = data;
  const query = User.findOne({ email });
  return await (lean ? query.lean() : query);
};

export const getUserByPhoneNumber = async (data: TByPhone): Promise<IUser | IUserDoc | null> => {
  const { lean = true, phoneNumber } = data;
  const query = User.findOne({ phoneNumber });
  return await (lean ? query.lean() : query);
};

export const getUserByEmailOrPhone = async (data: TByEmailOrPhone): Promise<IUser | IUserDoc> => {
  const { lean = true, ...rest } = data;

  const conditions: Record<keyof typeof rest, string>[] = [];

  if ('email' in rest && rest.email) conditions.push({ email: rest.email });
  if ('phoneNumber' in rest && rest.phoneNumber) conditions.push({ phoneNumber: rest.phoneNumber });

  const query = { $or: conditions };

  const user: IUser | null = lean ? await User.findOne(query).lean() : await User.findOne(query);

  if (!user) {
    throw new AppError({
      message: 'User not found',
      statusCode: 404,
      code: 'NOT_FOUND',
      fieldErrors: {
        ...('email' in rest && rest.email && { email: ['User not found'] }),
        ...('phoneNumber' in rest && rest.phoneNumber && { phoneNumber: ['User not found'] }),
      },
    });
  }

  return user;
};

export const createNewUser = async (payload: TUser): Promise<IUser> => {
  const user = await User.create(payload);

  if (!user) {
    throw new AppError({ message: 'User not created', statusCode: 500, code: 'INTERNAL_ERROR' });
  }

  return user;
};
