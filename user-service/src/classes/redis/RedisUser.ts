import { RedisHelper } from './RedisHelper.js';

export class RedisUser extends RedisHelper {
  private readonly USERS_KEY = 'bq:user-service:users';
}
