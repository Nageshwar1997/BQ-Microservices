import { parseData, stringifyData } from '@beautinique/be-utils';
import { type RedisClientType, createClient } from 'redis';
import { logger } from '../configs';
import type {
  TDraftProduct,
  TProductBasicInfo,
  TProductDescriptionAndContent,
  TProductMediaAndGallery,
  TProductStockAndVariants,
  TProductTryOnConfiguration,
} from '../controllers/product/saveDraftProduct.controller';
import { envs } from '../envs';
import { Category } from '../models';
import type { ICategory, TCacheCategory } from '../types';
import { getMinimalCategory } from '../utils';

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

  private readonly ONE_DAY_TTL = 60 * 60 * 24;

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

  // private async setData(key: string, ttl: number, data: unknown) {
  //   const client = this.getClient();

  //   if (!client) return;

  //   const strData = typeof data === 'string' ? data : stringifyData(data);

  //   try {
  //     await client.setEx(key, ttl, strData);
  //   } catch (err) {
  //     logger.warn('⚠️ Redis set failed:', err);
  //   }
  // }

  // private async getData<T>(key: string): Promise<T | null> {
  //   const client = this.getClient();

  //   if (!client) return null;

  //   try {
  //     const data = await client.get(key);

  //     return data ? (parseData(data) as T) : null;
  //   } catch (err) {
  //     logger.warn('⚠️ Redis get failed:', err);

  //     return null;
  //   }
  // }

  private async deleteData(key: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.del(key);
    } catch (err) {
      logger.warn('⚠️ Redis delete failed:', err);
    }
  }

  private async setHashData(key: string, field: string, data: unknown) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.hSet(key, field, stringifyData(data));

      await client.expire(key, this.ONE_DAY_TTL);
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

  private async exists(key: string): Promise<boolean> {
    const client = this.getClient();

    if (!client) return false;

    try {
      return (await client.exists(key)) === 1;
    } catch (err) {
      logger.warn('⚠️ Redis exists failed:', err);

      return false;
    }
  }

  /* ================= KEY HELPERS ================= */

  private getCategoriesKey() {
    return this.KEY_PREFIX.CATEGORIES;
  }

  private getDraftProductKey(userId: string) {
    return `${this.KEY_PREFIX.DRAFT_PRODUCT}:${userId}`;
  }

  /* ================= DRAFT PRODUCT ================= */

  private async getDraftHashData(key: string): Promise<Partial<TDraftProduct> | null> {
    const client = this.getClient();

    if (!client) return null;

    try {
      const data: Partial<Record<keyof TDraftProduct, string>> = await client.hGetAll(key);

      if (Object.keys(data).length === 0) {
        return null;
      }

      return {
        basicInfo: data.basicInfo ? parseData(data.basicInfo) : undefined,

        mediaAndGallery: data.mediaAndGallery ? parseData(data.mediaAndGallery) : undefined,

        descriptionAndContent: data.descriptionAndContent
          ? parseData(data.descriptionAndContent)
          : undefined,

        stockAndVariants: data.stockAndVariants ? parseData(data.stockAndVariants) : undefined,

        tryOnConfiguration: data.tryOnConfiguration
          ? parseData(data.tryOnConfiguration)
          : undefined,
      };
    } catch (err) {
      logger.warn('⚠️ Redis draft hGetAll failed:', err);

      return null;
    }
  }

  /* ================= DRAFT PRODUCT ================= */

  public async getDraftProduct(userId: string) {
    const key = this.getDraftProductKey(userId);

    return this.getDraftHashData(key);
  }

  public async saveDraftProductStep(
    userId: string,
    stepData:
      | TProductBasicInfo
      | TProductMediaAndGallery
      | TProductDescriptionAndContent
      | TProductStockAndVariants
      | TProductTryOnConfiguration,
  ) {
    const client = this.getClient();

    if (!client) return null;

    const key = this.getDraftProductKey(userId);

    const isNewDraft = !(await this.exists(key));

    const { step: _, ...data } = stepData;

    let field: keyof TDraftProduct;

    switch (stepData.step) {
      case 0:
        field = 'basicInfo';
        break;

      case 1:
        field = 'mediaAndGallery';
        break;

      case 2:
        field = 'descriptionAndContent';
        break;

      case 3:
        field = 'stockAndVariants';
        break;

      case 4:
        field = 'tryOnConfiguration';
        break;

      default:
        return null;
    }

    try {
      await client.hSet(key, field, stringifyData(data));

      if (isNewDraft) {
        await client.expire(key, this.ONE_DAY_TTL);
      }

      return this.getDraftHashData(key);
    } catch (err) {
      logger.warn('⚠️ Redis draft save failed:', err);

      return null;
    }
  }

  public async deleteDraftProduct(userId: string) {
    const key = this.getDraftProductKey(userId);

    await this.deleteData(key);
  }

  public async hasDraftProduct(userId: string) {
    const key = this.getDraftProductKey(userId);

    return this.exists(key);
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

  public async setCategory(category: ICategory) {
    const key = this.getCategoriesKey();
    const minimalCategory = getMinimalCategory(category);

    await this.setHashData(key, category._id.toString(), minimalCategory);
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
      .lean<ICategory[]>()
      .exec();

    const key = this.getCategoriesKey();

    const minimalCategories = categories.map((category) => getMinimalCategory(category));

    await Promise.all(
      minimalCategories.map((category) => this.setHashData(key, category._id, category)),
    );

    logger.info('📦 Categories cache seeded from DB');

    return minimalCategories;
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
