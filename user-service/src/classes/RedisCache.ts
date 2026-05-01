import { AppError } from '@beautinique/be-classes';
import { HOUR, MINUTE } from '@beautinique/be-constants';
import { parseData, stringifyData } from '@beautinique/be-utils';
import { type RedisClientType, createClient } from 'redis';
import { logger } from '../configs';
import { envs } from '../envs';
import { getUserById } from '../services';
import type { TId, TMinimalUser } from '../types';
import { generateOtp, generateTempToken } from '../utils';

interface IOtpData {
  otp: string;
  email: string;
  sendCount: number;
}

/* ================= CLIENT (Singleton) ================= */

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

/* ================= CACHE CLASS ================= */

class RedisCache {
  private client: RedisClientType;
  private isReady = false;

  private KEY_PREFIX = { USER: 'bq:user', TOKEN: 'bq:token' };

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

  /* ================= CONNECTION ================= */

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

  /* ================= CORE METHODS ================= */

  private async setData(key: string, ttl: number, data: unknown) {
    const client = this.getClient();
    if (!client) return;

    const strData = typeof data === 'string' ? data : stringifyData(data);

    try {
      await client.setEx(key, ttl, strData);
    } catch (err) {
      logger.warn('⚠️ Redis set failed:', err);
    }
  }

  private async getData(key: string) {
    const client = this.getClient();
    if (!client) return null;

    try {
      const data = await client.get(key);
      return data ? parseData(data) : null;
    } catch (err) {
      logger.warn('⚠️ Redis get failed:', err);
      return null;
    }
  }

  private async deleteData(key: string) {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.del(key);
    } catch (err) {
      logger.warn('⚠️ Redis delete failed:', err);
    }
  }

  /* ================= KEY HELPERS ================= */

  private getUserKey(userId: string | TId) {
    return `${this.KEY_PREFIX.USER}:${userId}`;
  }

  private getTokenKey(token: string) {
    return `${this.KEY_PREFIX.TOKEN}:${token}`;
  }

  /* ================= DB HELPER ================= */

  private getDbUser(userId: string | TId) {
    return getUserById({ id: userId });
  }

  /* ================= USER CACHE ================= */

  public async setUser(user: TMinimalUser) {
    const key = this.getUserKey(user._id);
    await this.setData(key, HOUR * 24, user);
  }

  public async getUser(userId: string | TId): Promise<TMinimalUser | null> {
    const key = this.getUserKey(userId);

    // 1️. Try cache
    const cachedUser = await this.getData(key);
    if (cachedUser) {
      return cachedUser;
    }

    // 2️. Fallback to DB
    const rawUser = await this.getDbUser(userId);
    if (!rawUser) return null;

    const { status: _, ...user } = rawUser;

    // 3️. Set cache (non-blocking)
    void this.setUser(user);

    return user;
  }

  public async updateUser(user: TMinimalUser) {
    await this.setUser(user);
  }

  public async deleteUser(userId: string | TId) {
    const key = this.getUserKey(userId);
    await this.deleteData(key);
  }

  /* ================= OTP CACHE ================= */

  public async setOtpData(email: string) {
    const otp = generateOtp();
    const token = generateTempToken(20);

    const key = this.getTokenKey(token);

    const data = { otp, email, sendCount: 1 };

    await this.setData(key, MINUTE * 10, data);

    return { token, ...data };
  }

  public async getOtpData(token: string) {
    const key = this.getTokenKey(token);
    return (await this.getData(key)) as IOtpData | null;
  }

  public async updateOtpData(token: string) {
    const prevData = await this.getOtpData(token);

    if (!prevData) {
      throw new AppError({
        message: 'OTP session expired or invalid',
        statusCode: 400,
        code: 'AUTH_ERROR',
      });
    }

    const key = this.getTokenKey(token);

    const updated = {
      ...prevData,
      sendCount: prevData.sendCount + 1,
      otp: generateOtp(),
    };

    await this.setData(key, MINUTE * 10, updated);

    return updated;
  }

  public async deleteOtpData(token: string) {
    const key = this.getTokenKey(token);
    await this.deleteData(key);
  }

  /* ================= CLOSE ================= */

  public async close() {
    try {
      await this.client.quit();
      this.isReady = false;

      logger.warn('🛑 Redis Cache Connection Closed');
    } catch (err) {
      logger.error('❌ Redis close failed:', err);
    }
  }
}

export const redisCache = new RedisCache();
