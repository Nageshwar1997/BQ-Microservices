import { RedisHelper } from './RedisHelper.js';

export class RedisToken extends RedisHelper {
  private readonly TOKENS_KEY = 'bq:user-service:tokens';
}
