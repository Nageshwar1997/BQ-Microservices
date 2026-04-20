import { logger } from '@/configs';
import { envs } from '@/envs';
import { getUserById } from '@/services';
import type { IUser, TId } from '@/types';
import { generateOtp, generateTempToken } from '@/utils';
import { HOUR, MINUTE } from '@beautinique/be-constants';
import { parseData, stringifyData } from '@beautinique/be-utils';
import { type RedisClientType, createClient } from 'redis';

const client: RedisClientType = createClient({
  socket: {
    host: envs.redis.caching.host,
    port: envs.redis.caching.port,
    reconnectStrategy: (retries: number): number | false => {
      if (retries >= 5) {
        // Max reconnect attempts
        logger.error('❌ Max Redis reconnection attempts reached');
        return false;
      }
      const delay = Math.min(retries * 1000, 10000); //10s
      logger.info(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries + 1})`);
      return delay;
    },
  },
  password: envs.redis.caching.password,
});

class RedisCache {
  private client: RedisClientType;
  private isReady = false;
  private KEY_PREFIX = { USER: 'bq:user', OTP_TOKEN: 'bq:otp-token' };

  constructor() {
    this.client = client;

    this.client.on('error', (err) => {
      logger.error('❌ Redis Error:', err);
      this.isReady = false;
    });

    this.client.on('connect', () => {
      logger.info('👍 Redis Connected');
      this.isReady = true;
    });

    this.client.on('reconnecting', () => {
      logger.warn('⚠️ Redis Reconnecting');
      this.isReady = false;
    });

    this.client.on('end', () => {
      logger.warn('👋 Redis Connection Ended');
      this.isReady = false;
    });
  }

  /* ---------------- CONNECTION ---------------- */

  public async connect() {
    try {
      await this.client.connect();
    } catch (err) {
      logger.error('❌ Redis connection failed:', err);
      this.isReady = false;
    }
  }

  private getClient(): RedisClientType | null {
    if (!this.isReady) {
      logger.warn('⚠️ Redis unavailable → fallback to DB');
      return null;
    }
    return this.client;
  }

  private getUserKey(userId: string | TId) {
    return `${this.KEY_PREFIX.USER}:${userId}`;
  }

  private getOtpTokenKey(otpToken: string) {
    return `${this.KEY_PREFIX.OTP_TOKEN}:${otpToken}`;
  }

  /* ---------------- DB HELPER ---------------- */

  private async getDbUser(userId: string | TId) {
    return await getUserById({ id: userId });
  }

  /* ---------------- SET CACHE ---------------- */

  public async setUser(user: IUser) {
    const client = this.getClient();
    const key = this.getUserKey(user._id);
    if (!client || !user) return;

    try {
      const { password: _password, ...restUser } =
        typeof user.toObject === 'function' ? user.toObject() : user;

      await client.setEx(key, HOUR * 24, stringifyData(restUser));
    } catch (err) {
      logger.error('❌ Redis set failed:', err);
    }
  }

  public async setOtpToken(email: string) {
    const client = this.getClient();
    const otpToken = generateTempToken(20);
    const otp = generateOtp();

    const key = this.getOtpTokenKey(otpToken);

    const sendCount = 1;

    client?.setEx(key, MINUTE * 10, stringifyData({ otp, email, sendCount }));

    return { otpToken, sendCount, otp };
  }

  /* ---------------- GET CACHE ---------------- */

  public async getUser(userId: string | TId): Promise<IUser | null> {
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
          logger.warn('⚠️ Corrupted cache detected, repairing...', err);

          // self-heal
          await client.del(key);

          const user = await this.getDbUser(userId);
          if (user) await this.setUser(user);

          return user;
        }
      }

      // Cache miss
      const user = await this.getDbUser(userId);

      if (user) {
        await this.setUser(user);
      }

      return user;
    } catch (err) {
      logger.error('❌ Redis get failed:', err);

      // fallback
      return await this.getDbUser(userId);
    }
  }

  /* ---------------- UPDATE CACHE ---------------- */

  public async updateUser(user: IUser) {
    const client = this.getClient();
    if (!client || !user) return;

    // write-through
    await this.setUser(user);
  }

  /* ---------------- DELETE CACHE ---------------- */

  public async deleteUser(userId: string | TId) {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.del(this.getUserKey(userId));
    } catch (err) {
      logger.error('❌ Redis delete failed:', err);
    }
  }

  /* ---------------- CLOSE ---------------- */

  public async close() {
    try {
      if (!this.client) return;

      await this.client.quit();
      this.isReady = false;

      logger.warn('🛑 Redis Cache Connection Closed');
    } catch (err) {
      logger.error('❌ Redis close failed:', err);
    }
  }
}

export const redisCache = new RedisCache();
