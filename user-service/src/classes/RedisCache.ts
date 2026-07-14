import { AppError } from '@beautinique/be-classes';
import { HOUR, MINUTE } from '@beautinique/be-constants';
import { parseData, stringifyData } from '@beautinique/shared-utils';
import { createClient, type RedisClientType } from 'redis';

import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { getUserById } from '../services/index.js';
import type { TId, TMinimalUser } from '../types/index.js';
import { generateOtp, generateTempToken, getMinimalUser } from '../utils/index.js';

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
      logger.info(`🔄 Redis reconnecting in ${String(delay)}ms (attempt ${String(retries + 1)})`);
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

  private KEY_PREFIX = { USER: 'bq:user-service:users', TOKEN: 'bq:user-service:tokens' };

  constructor() {
    this.client = client;

    this.client.on('error', (err) => {
      logger.error(err, '❌ Redis connection error:');
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
      logger.error(err, '❌ Redis connection failed:');
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
      logger.warn(err, '⚠️  Redis set failed:');
    }
  }

  private async getData<T = unknown>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const data = await client.get(key);
      return data ? parseData<T>(data) : null;
    } catch (err) {
      logger.warn(err, '⚠️  Redis get failed:');
      return null;
    }
  }

  private async deleteData(key: string) {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.del(key);
    } catch (err) {
      logger.warn(err, '⚠️  Redis delete failed:');
    }
  }

  /* ================= KEY HELPERS ================= */

  private getUserKey(userId: string | TId) {
    return `${this.KEY_PREFIX.USER}:${userId.toString()}`;
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

  public async getUser(userId: string | TId): Promise<TMinimalUser> {
    const key = this.getUserKey(userId);

    // 1️. Try cache
    const cachedUser = await this.getData<TMinimalUser>(key);
    if (cachedUser) {
      return cachedUser;
    }

    // 2️. Fallback to DB
    const rawUser = await this.getDbUser(userId);

    const user = getMinimalUser(rawUser);

    // 3️. Set cache (non-blocking)
    await this.setUser(user);

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
    return await this.getData<IOtpData | null>(key);
  }

  public async updateOtpData(token: string) {
    const prevData = await this.getOtpData(token);

    if (!prevData) {
      throw new AppError({ message: 'OTP session expired or invalid', code: 'VALIDATION_ERROR' });
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
      logger.error(err, '❌ Redis close failed:');
    }
  }
}

export const redisCache = new RedisCache();
