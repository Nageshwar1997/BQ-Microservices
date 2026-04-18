import { User } from '@/models';
import type { IUser, TId, TUser } from '@/types';
import { AppError } from '@beautinique/be-classes';

export const getUserByEmail = async ({
  email,
  lean = true,
}: Pick<TUser, 'email'> & {
  lean?: boolean;
}): Promise<IUser | null> => {
  const baseQuery = User.findOne({ email });

  const finalQuery = lean ? baseQuery.lean() : baseQuery;

  return await finalQuery;
};

export const getUserByPhoneNumber = async ({
  phoneNumber,
  lean = true,
}: Pick<IUser, 'phoneNumber'> & {
  lean?: boolean;
}): Promise<IUser | null> => {
  const baseQuery = User.findOne({ phoneNumber });

  const finalQuery = lean ? baseQuery.lean() : baseQuery;

  return await finalQuery;
};

export const getUserByEmailOrPhoneNumber = async ({
  email,
  phoneNumber,
  lean = true,
}: Pick<IUser, 'email' | 'phoneNumber'> & {
  lean?: boolean;
}): Promise<IUser> => {
  const user: IUser | null = lean
    ? await User.findOne({
        $or: [{ email }, { phoneNumber }],
      }).lean()
    : await User.findOne({
        $or: [{ email }, { phoneNumber }],
      });

  if (!user) {
    throw new AppError({
      message: 'User not found',
      statusCode: 404,
      code: 'NOT_FOUND',
      fieldErrors: {
        ...(email && { email: ['User not found'] }),
        ...(phoneNumber && { phoneNumber: ['User not found'] }),
      },
    });
  }

  return user;
};

export const getUserById = async ({
  id,
  lean = true,
  password = false,
}: {
  id: string | TId;
  lean?: boolean;
  password?: boolean;
}): Promise<IUser> => {
  const baseQuery = User.findById(id);

  const query = password ? baseQuery.select('-password') : baseQuery;

  const finalQuery = lean ? query.lean() : query;

  const user = await finalQuery;

  if (!user) {
    throw new AppError({
      message: 'User not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }

  return user;
};
