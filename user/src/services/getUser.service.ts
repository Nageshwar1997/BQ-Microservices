import { User } from '@/models';
import { IUser, TId, TUser } from '@/types';
import { AppError } from '@beautinique/be-classes';

export const getUserByEmail = async ({
  email,
  lean = true,
}: Pick<TUser, 'email'> & {
  lean?: boolean;
}): Promise<IUser | null> => {
  let user: IUser | null = null;
  if (lean) {
    user = await User.findOne({ email }).lean();
  } else {
    user = await User.findOne({ email });
  }
  return user;
};

export const getUserByPhoneNumber = async ({
  phoneNumber,
  lean = true,
}: Pick<IUser, 'phoneNumber'> & {
  lean?: boolean;
}): Promise<IUser | null> => {
  let user: IUser | null = null;
  if (lean) {
    user = await User.findOne({ phoneNumber }).lean();
  } else {
    user = await User.findOne({ phoneNumber });
  }
  return user;
};

export const getUserByEmailOrPhoneNumber = async ({
  email,
  phoneNumber,
  lean = true,
}: Pick<IUser, 'email' | 'phoneNumber'> & {
  lean?: boolean;
}): Promise<IUser> => {
  let user: IUser | null = null;
  if (lean) {
    user = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    }).lean();
  } else {
    user = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });
  }

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
  let query = User.findById(id);

  if (lean) query = query.lean() as typeof query;
  if (password) query = query.select('-password');

  const user: IUser | null = await query;

  if (!user) {
    throw new AppError({
      message: 'User not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }

  return user;
};
