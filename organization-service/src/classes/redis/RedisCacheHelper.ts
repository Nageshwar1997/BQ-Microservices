import { parseData, stringifyData } from '@beautinique/shared-utils';
import type { RedisClientType } from 'redis';

import { logger } from '../../configs/index.js';

export class RedisCacheHelper {
  protected readonly client: RedisClientType;
  protected readonly getClient: () => RedisClientType | null;

  constructor(client: RedisClientType, getClient: () => RedisClientType | null) {
    this.client = client;
    this.getClient = getClient;
  }

  /* ================= STRING ================= */

  protected async setData(key: string, ttl: number, data: unknown) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.setEx(key, ttl, typeof data === 'string' ? data : stringifyData(data));
    } catch (error) {
      logger.warn(error, '⚠️  Redis set failed:');
    }
  }

  protected async getData<T = unknown>(key: string): Promise<T | null> {
    const client = this.getClient();

    if (!client) return null;

    try {
      const data = await client.get(key);

      if (!data) return null;

      try {
        return parseData<T>(data);
      } catch {
        // `setData` stores a plain string as-is, not JSON-stringified (see
        // above) - a bare word like `Kerala` isn't valid JSON on its own,
        // so `JSON.parse` throws for exactly the values `setData`'s string
        // branch wrote. Discovered by task 6.4's pincode->state cache (the
        // first caller here to ever cache a raw string) - every existing
        // cache in this service stores objects, which round-trip through
        // `parseData` fine, so this never surfaced before. Mirror
        // `setData`'s own special-case instead of assuming everything is JSON.
        return data as T;
      }
    } catch (error) {
      logger.warn(error, '⚠️ Redis get failed:');

      return null;
    }
  }

  protected async deleteData(key: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.del(key);
    } catch (error) {
      logger.warn(error, '⚠️ Redis delete failed:');
    }
  }

  /* ================= HASH ================= */

  protected async setHashData(key: string, field: string, data: unknown, ttl?: number) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.hSet(key, field, stringifyData(data));

      if (ttl) {
        await client.expire(key, ttl);
      }
    } catch (error) {
      logger.warn(error, '⚠️ Redis hSet failed:');
    }
  }

  protected async getHashField<T = unknown>(key: string, field: string): Promise<T | null> {
    const client = this.getClient();

    if (!client) return null;

    try {
      const data = await client.hGet(key, field);

      return data ? parseData<T>(data) : null;
    } catch (error) {
      logger.warn(error, '⚠️  Redis hGet failed:');

      return null;
    }
  }

  protected async getAllHashFields<T = unknown>(key: string): Promise<Record<string, T>> {
    const client = this.getClient();

    if (!client) return {};

    try {
      const data = await client.hGetAll(key);

      return Object.fromEntries(
        Object.entries(data).map(([field, value]) => [field, parseData(value) as T]),
      );
    } catch (error) {
      logger.warn(error, '⚠️ Redis hGetAll failed:');

      return {};
    }
  }

  protected async deleteHashField(key: string, field: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.hDel(key, field);
    } catch (error) {
      logger.warn(error, '⚠️ Redis hDel failed:');
    }
  }

  protected async deleteHashData(key: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.del(key);
    } catch (error) {
      logger.warn(error, '⚠️ Redis hash delete failed:');
    }
  }

  /* ================= COMMON ================= */

  protected async exists(key: string): Promise<boolean> {
    const client = this.getClient();

    if (!client) return false;

    try {
      return (await client.exists(key)) === 1;
    } catch (error) {
      logger.warn(error, '⚠️ Redis exists failed:');

      return false;
    }
  }

  protected async hasHashField(key: string, field: string): Promise<boolean> {
    const client = this.getClient();

    if (!client) return false;

    try {
      return (await client.hExists(key, field)) === 1;
    } catch (error) {
      logger.warn(error, '⚠️ Redis hExists failed:');

      return false;
    }
  }
}
