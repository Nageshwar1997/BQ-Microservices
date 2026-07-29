import { getUserById } from '../../services/index.js';
import type { IMinimalUser, TId } from '../../types/index.js';
import { getMinimalUser } from '../../utils/index.js';
import { RedisCacheHelper } from './RedisCacheHelper.js';

const USER_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day

export class RedisCacheUser extends RedisCacheHelper {
  private readonly USERS_KEY = 'bq:user-service:users';

  private getUserKey(userId: string | TId) {
    return `${this.USERS_KEY}:${userId.toString()}`;
  }

  public async setUser(user: IMinimalUser) {
    await this.setData(this.getUserKey(user._id), USER_CACHE_TTL_SECONDS, user);
  }

  public async getUser(userId: string | TId): Promise<IMinimalUser> {
    const key = this.getUserKey(userId);

    // 1. Try cache
    const cachedUser = await this.getData<IMinimalUser>(key);

    if (cachedUser) {
      return cachedUser;
    }

    // 2. Fallback to DB
    const rawUser = await getUserById({ id: userId });
    const user = getMinimalUser(rawUser);

    // 3. Populate cache
    await this.setUser(user);

    return user;
  }

  public async updateUser(user: IMinimalUser) {
    await this.setUser(user);
  }

  public async deleteUser(userId: string | TId) {
    await this.deleteData(this.getUserKey(userId));
  }
}
