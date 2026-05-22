import { parseData, stringifyData } from '@beautinique/be-utils';
import { type RedisClientType, createClient } from 'redis';
import { logger } from '../configs';
import { envs } from '../envs';
import { Category } from '../models';
import type { TCacheCategory, TDraftProduct } from '../types';

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

  private readonly CATEGORY_TTL = 60 * 60 * 24;

  private KEY_PREFIX = {
    DRAFT_PRODUCT: 'bq:draft-product',
    CATEGORIES: 'bq:categories',
  };

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

  // private async getData(key: string) {
  //   const client = this.getClient();
  //   if (!client) return null;

  //   try {
  //     const data = await client.get(key);
  //     return data ? parseData(data) : null;
  //   } catch (err) {
  //     logger.warn('⚠️ Redis get failed:', err);
  //     return null;
  //   }
  // }

  // private async deleteData(key: string) {
  //   const client = this.getClient();
  //   if (!client) return;

  //   try {
  //     await client.del(key);
  //   } catch (err) {
  //     logger.warn('⚠️ Redis delete failed:', err);
  //   }
  // }

  private async setHashData(key: string, field: string, data: unknown) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.hSet(key, field, stringifyData(data));

      await client.expire(key, this.CATEGORY_TTL);
    } catch (err) {
      logger.warn('⚠️ Redis hSet failed:', err);
    }
  }

  private async getHashData<T>(key: string): Promise<T[]> {
    const client = this.getClient();

    if (!client) return [];

    try {
      const data = await client.hGetAll(key);

      return Object.values(data).map((item) => parseData(item) as T);
    } catch (err) {
      logger.warn('⚠️ Redis hGetAll failed:', err);

      return [];
    }
  }

  private async deleteHashField(key: string, field: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.hDel(key, field);
    } catch (err) {
      logger.warn('⚠️ Redis hDel failed:', err);
    }
  }

  /* ================= KEY HELPERS ================= */

  private getCategoriesKey() {
    return this.KEY_PREFIX.CATEGORIES;
  }

  private getDraftProductKey(userId: string, draftId: string) {
    return `${this.KEY_PREFIX.DRAFT_PRODUCT}:${userId}:${draftId}`;
  }

  /* ================= DRAFT PRODUCT ================= */

  public setDraftProduct(userId: string, draftId: string, ttl: number, data: TDraftProduct) {
    const key = this.getDraftProductKey(userId, draftId);

    return this.setData(key, ttl, data);
  }

  /* ================= CATEGORY ================= */

  public async getAllCategories(): Promise<TCacheCategory[]> {
    const key = this.getCategoriesKey();

    // 1. Try cache
    const categories = await this.getHashData<TCacheCategory>(key);

    if (categories.length > 0) {
      return categories;
    }

    // 2. Fallback to DB
    return this.seedCategoriesCache();
  }

  public async setCategory(category: TCacheCategory) {
    const key = this.getCategoriesKey();

    await this.setHashData(key, category._id.toString(), category);
  }

  public async deleteCategory(categoryId: string) {
    const key = this.getCategoriesKey();

    await this.deleteHashField(key, categoryId);
  }

  /* ================= DB HELPER ================= */

  private async seedCategoriesCache(): Promise<TCacheCategory[]> {
    const categories = await Category.find()
      .select('_id name slug parent level description')
      .sort({ level: 1, slug: 1 })
      .lean()
      .exec();

    const key = this.getCategoriesKey();

    await Promise.all(
      categories.map((category) => this.setHashData(key, category._id.toString(), category)),
    );

    logger.info('📦 Categories cache seeded from DB');

    return categories;
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
