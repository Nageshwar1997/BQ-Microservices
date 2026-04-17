import { OAuthService } from '@/apis/OAuthService';
import { RedisService } from '@/classes/RedisService';

export * from './getUser.service';

export const redisService = new RedisService();
export const oAuthService = new OAuthService();
