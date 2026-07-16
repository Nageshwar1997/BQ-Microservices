import { parseData, stringifyData } from '@beautinique/be-utils';
import type { RedisClientType } from 'redis';

import { logger } from '../configs/index.js';

export class RedisHelper {
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
    } catch (err) {
      logger.warn(err, '⚠️ Redis set failed:');
    }
  }

  protected async getData<T>(key: string): Promise<T | null> {
    const client = this.getClient();

    if (!client) return null;

    try {
      const data = await client.get(key);

      return data ? (parseData(data) as T) : null;
    } catch (err) {
      logger.warn(err, '⚠️ Redis get failed:');

      return null;
    }
  }

  protected async deleteData(key: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.del(key);
    } catch (err) {
      logger.warn(err, '⚠️ Redis delete failed:');
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
    } catch (err) {
      logger.warn(err, '⚠️ Redis hSet failed:');
    }
  }

  protected async getHashField<T>(key: string, field: string): Promise<T | null> {
    const client = this.getClient();

    if (!client) return null;

    try {
      const data = await client.hGet(key, field);

      return data ? (parseData(data) as T) : null;
    } catch (err) {
      logger.warn(err, '⚠️ Redis hGet failed:');

      return null;
    }
  }

  protected async getAllHashFields<T>(key: string): Promise<Record<string, T>> {
    const client = this.getClient();

    if (!client) return {};

    try {
      const data = await client.hGetAll(key);

      return Object.fromEntries(
        Object.entries(data).map(([field, value]) => [field, parseData(value) as T]),
      );
    } catch (err) {
      logger.warn(err, '⚠️ Redis hGetAll failed:');

      return {};
    }
  }

  protected async deleteHashField(key: string, field: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.hDel(key, field);
    } catch (err) {
      logger.warn(err, '⚠️ Redis hDel failed:');
    }
  }

  protected async deleteHashData(key: string) {
    const client = this.getClient();

    if (!client) return;

    try {
      await client.del(key);
    } catch (err) {
      logger.warn(err, '⚠️ Redis hash delete failed:');
    }
  }

  /* ================= COMMON ================= */

  protected async exists(key: string): Promise<boolean> {
    const client = this.getClient();

    if (!client) return false;

    try {
      return (await client.exists(key)) === 1;
    } catch (err) {
      logger.warn(err, '⚠️ Redis exists failed:');

      return false;
    }
  }

  protected async hasHashField(key: string, field: string): Promise<boolean> {
    const client = this.getClient();

    if (!client) return false;

    try {
      return (await client.hExists(key, field)) === 1;
    } catch (err) {
      logger.warn(err, '⚠️ Redis hExists failed:');

      return false;
    }
  }
}
