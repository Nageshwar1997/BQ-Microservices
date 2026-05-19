import { AppError } from '@beautinique/be-classes';
import { parseData, stringifyData } from '@beautinique/be-utils';
import { type RedisClientType, createClient } from 'redis';
import { logger } from '../configs';
import { envs } from '../envs';
import { Category } from '../models';
import type { TCategory, TDraftProduct } from '../types';

type TCacheCategory = Pick<TCategory, 'level' | 'parent' | 'name' | '_id' | 'slug' | 'description'>;

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
  // Make it private later
  protected isReady = false;

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

  // private async deleteData(key: string) {
  //   const client = this.getClient();
  //   if (!client) return;

  //   try {
  //     await client.del(key);
  //   } catch (err) {
  //     logger.warn('⚠️ Redis delete failed:', err);
  //   }
  // }

  /* ================= KEY HELPERS ================= */

  private getCategoriesKey() {
    return this.KEY_PREFIX.CATEGORIES;
  }

  private getDraftProductKey(userId: string, draftId: string) {
    return `${this.KEY_PREFIX.DRAFT_PRODUCT}:${userId}:${draftId}`;
  }

  public setDraftProduct(userId: string, draftId: string, ttl: number, data: TDraftProduct) {
    const key = this.getDraftProductKey(userId, draftId);
    return this.setData(key, ttl, data);
  }

  /* ================= CACHE HELPER ================= */

  /* ================= CATEGORY ================= */

  public async getAllCategories(): Promise<TCacheCategory[]> {
    const key = this.getCategoriesKey();

    // 1️. Try cache
    const cachedCategories: TCacheCategory[] | null = await this.getData(key);
    if (cachedCategories && cachedCategories.length > 0) {
      return cachedCategories;
    }

    // 2️. Fallback to DB
    return this.getAllDbCategories();
  }

  /* ================= DB HELPER ================= */

  private async getAllDbCategories(): Promise<TCacheCategory[]> {
    const categories = await Category.find()
      .select('_id name slug parent level')
      .sort({ slug: 1 })
      .lean()
      .exec();

    if (!categories) {
      throw new AppError({ message: 'Categories not found', code: 'NOT_FOUND' });
    }

    const key = this.getCategoriesKey();

    void this.setData(key, 60 * 60 * 24, categories);

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
