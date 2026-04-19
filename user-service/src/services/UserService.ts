import { User } from '@/models';
import type { IUser, TId, TUser } from '@/types';
import { commonUtils } from '@/utils';
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

class GetUserService {
  public async by_id(data: IById): Promise<IUser> {
    const { id, lean = true, password = false } = data;
    const _id = typeof id === 'string' ? commonUtils.toObjectId(id) : id;
    const baseQuery = User.findById(_id);
    const query = password ? baseQuery.select('-password') : baseQuery;

    const user = await (lean ? query.lean() : query);
    if (!user) {
      throw new AppError({ message: 'User not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    return user;
  }

  public async by_email(data: TByEmail): Promise<IUser | null> {
    const { lean = true, email } = data;
    const query = User.findOne({ email });
    return await (lean ? query.lean() : query);
  }

  public async by_phone(data: TByPhone): Promise<IUser | null> {
    const { lean = true, phoneNumber } = data;
    const query = User.findOne({ phoneNumber });
    return await (lean ? query.lean() : query);
  }

  public async by_email_or_phone(data: TByEmailOrPhone): Promise<IUser> {
    const { lean = true, ...rest } = data;

    const conditions: Record<keyof typeof rest, string>[] = [];

    if ('email' in rest && rest.email) conditions.push({ email: rest.email });
    if ('phoneNumber' in rest && rest.phoneNumber)
      conditions.push({ phoneNumber: rest.phoneNumber });

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
  }
}

class SetUserService {
  public async create(payload: TUser): Promise<IUser> {
    const user = await User.create(payload);
    return user;
  }
}

export const getUserService = new GetUserService();
export const setUserService = new SetUserService();
