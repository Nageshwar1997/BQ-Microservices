import { redisClientConfig } from '@/configs';
import { getUserById } from '@/services';
import { IUser, TId } from '@/types';
import { HOUR } from '@beautinique/be-constants';
import { parseData, stringifyData } from '@beautinique/be-utils';
import { RedisClientType } from 'redis';

export class RedisService {
  private client: RedisClientType | null = null;
  private isReady: boolean = false;
  private USER_KEY_PREFIX = 'bq:user';

  constructor() {
    this.client = redisClientConfig;

    this.client.on('error', (err) => {
      console.error('❌ Redis Error:', err);
      this.isReady = false;
    });

    this.client.on('connect', () => {
      console.log('👍 Redis Connected');
      this.isReady = true;
    });

    this.client.on('reconnecting', () => {
      console.warn('⚠️ Redis Reconnecting');
      this.isReady = false;
    });

    this.client.on('end', () => {
      console.warn('👋 Redis Connection Ended');
      this.isReady = false;
    });
  }

  /* ---------------- CONNECTION ---------------- */

  public async connect() {
    try {
      await this.client?.connect();
    } catch (err) {
      console.error('❌ Redis connection failed:', err);
      this.isReady = false;
    }
  }

  private getClient(): RedisClientType | null {
    if (!this.client || !this.isReady) {
      console.warn('⚠️ Redis unavailable → fallback to DB');
      return null;
    }
    return this.client;
  }

  private getUserKey(userId: string | TId) {
    return `${this.USER_KEY_PREFIX}:${userId}`;
  }

  /* ---------------- DB HELPER ---------------- */

  private async getDbUser(userId: string | TId) {
    try {
      return await getUserById({ id: userId });
    } catch (err) {
      console.error('❌ DB fetch failed:', err);
      return null;
    }
  }

  /* ---------------- SET CACHE ---------------- */

  public async setCachedUser(user: IUser) {
    const client = this.getClient();
    if (!client || !user) return;

    try {
      const { password: _, ...restUser } =
        typeof user.toObject === 'function' ? user.toObject() : user;

      await client.setEx(this.getUserKey(user._id), HOUR, stringifyData(restUser));
    } catch (err) {
      console.error('❌ Redis set failed:', err);
    }
  }

  /* ---------------- GET CACHE ---------------- */

  public async getCachedUser(userId: string | TId): Promise<IUser | null> {
    const client = this.getClient();

    // Redis unavailable → DB direct
    if (!client) {
      return await this.getDbUser(userId);
    }

    const key = this.getUserKey(userId);

    try {
      const cachedUser = await client.get(key);

      if (cachedUser) {
        try {
          return parseData(cachedUser);
        } catch (err) {
          console.warn('⚠️ Corrupted cache detected, repairing...');

          // self-heal
          await client.del(key);

          const user = await this.getDbUser(userId);
          if (user) await this.setCachedUser(user);

          return user;
        }
      }

      // Cache miss
      const user = await this.getDbUser(userId);

      if (user) {
        await this.setCachedUser(user);
      }

      return user;
    } catch (err) {
      console.error('❌ Redis get failed:', err);

      // fallback
      return await this.getDbUser(userId);
    }
  }

  /* ---------------- UPDATE CACHE ---------------- */

  public async updateCachedUser(user: IUser) {
    const client = this.getClient();
    if (!client || !user) return;

    // write-through
    await this.setCachedUser(user);
  }

  /* ---------------- DELETE CACHE ---------------- */

  public async deleteCachedUser(userId: string | TId) {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.del(this.getUserKey(userId));
    } catch (err) {
      console.error('❌ Redis delete failed:', err);
    }
  }
}
