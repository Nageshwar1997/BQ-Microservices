import { logger } from '@/configs';
import { envs } from '@/envs';
import { getUserById } from '@/services';
import type { IUser, TId } from '@/types';
import { generateOtp, generateTempToken } from '@/utils';
import { AppError } from '@beautinique/be-classes';
import { HOUR, MINUTE } from '@beautinique/be-constants';
import { parseData, stringifyData } from '@beautinique/be-utils';
import { type RedisClientType, createClient } from 'redis';

const client: RedisClientType = createClient({
  socket: {
    host: envs.redis.cache.host,
    port: envs.redis.cache.port,
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
  username: envs.redis.cache.username,
  password: envs.redis.cache.password,
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

  private async setData(key: string, ttl: number, data: unknown) {
    const client = this.getClient();
    if (!client) {
      throw new AppError({ message: 'Redis unavailable', statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    const strData = typeof data === 'string' ? data : stringifyData(data);

    try {
      await client.setEx(key, ttl, strData);
    } catch (err) {
      logger.warn('⚠️ Redis set failed:', err);
      throw err;
    }
  }

  private async getData(key: string) {
    const client = this.getClient();
    if (!client) {
      throw new AppError({ message: 'Redis unavailable', statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    try {
      const data = await client.get(key);
      return data ? parseData(data) : null;
    } catch (err) {
      logger.warn('⚠️ Redis get failed:', err);
      throw err;
    }
  }

  private async deleteData(key: string) {
    const client = this.getClient();
    if (!client) {
      throw new AppError({ message: 'Redis unavailable', statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    try {
      await client.del(key);
    } catch (err) {
      logger.warn('⚠️ Redis delete failed:', err);
      throw err;
    }
  }

  /* ---------------- GET KEY ---------------- */
  private getUserKey(userId: string | TId) {
    return `${this.KEY_PREFIX.USER}:${userId}`;
  }

  private getOtpTokenKey(otpToken: string) {
    return `${this.KEY_PREFIX.OTP_TOKEN}:${otpToken}`;
  }

  /* ---------------- USER DB HELPER ---------------- */

  private async getDbUser(userId: string | TId) {
    return await getUserById({ id: userId });
  }

  /* ---------------- SET USER CACHE ---------------- */

  public async setUser(user: IUser) {
    const key = this.getUserKey(user._id);
    if (!user) return;

    await this.setData(key, HOUR * 24, user);
  }

  /* ---------------- GET USER CACHE ---------------- */

  public async getUser(userId: string | TId): Promise<IUser | null> {
    const client = this.getClient();

    // Redis unavailable → DB direct
    if (!client) {
      return await this.getDbUser(userId);
    }

    const key = this.getUserKey(userId);

    const parsedUser = await this.getData(key);
    if (parsedUser) {
      return parsedUser;
    }

    await this.deleteData(key);
    const user = await this.getDbUser(userId);
    if (user) await this.setUser(user);

    return user;
  }

  /* ---------------- UPDATE USER CACHE ---------------- */

  public async updateUser(user: IUser) {
    if (!user) return;
    // write-through
    await this.setUser(user);
  }

  /* ---------------- DELETE USER CACHE ---------------- */

  public async deleteUser(userId: string | TId) {
    const key = this.getUserKey(userId);
    await this.deleteData(key);
  }

  /* ---------------- SET OTP & TOKEN CACHE ---------------- */

  public async setOtpToken(email: string) {
    const otp = generateOtp();
    const otpToken = generateTempToken(20);

    const key = this.getOtpTokenKey(otpToken);

    const sendCount = 1;

    await this.setData(key, MINUTE * 10, { otp, email, sendCount });

    return { otpToken, sendCount, otp, email };
  }

  /* ---------------- GET OTP & TOKEN CACHE ---------------- */

  public async getOtpToken(otpToken: string) {
    const key = this.getOtpTokenKey(otpToken);

    const parsedData = (await this.getData(key)) as Awaited<
      ReturnType<typeof this.setOtpToken>
    > | null;

    return parsedData;
  }

  /* ---------------- UPDATE OTP & TOKEN CACHE ---------------- */

  public async updateOtpToken(otpToken: string) {
    const prevData = await this.getOtpToken(otpToken);

    if (!prevData) {
      throw new AppError({
        message: 'OTP session expired or invalid',
        statusCode: 400,
        code: 'AUTH_ERROR',
      });
    }

    const key = this.getOtpTokenKey(otpToken);

    const sendCount = ++prevData.sendCount;
    const otp = generateOtp();

    await this.setData(key, MINUTE * 10, { ...prevData, sendCount, otp });

    return { ...prevData, sendCount, otp } as Awaited<ReturnType<typeof this.setOtpToken>>;
  }

  /* ---------------- DELETE OTP & TOKEN CACHE ---------------- */

  public async deleteOtpToken(otpToken: string) {
    const key = this.getOtpTokenKey(otpToken);
    await this.deleteData(key);
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
