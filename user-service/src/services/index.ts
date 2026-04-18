import { OAuthService } from '@/apis/OAuthService';
import { CachingRedisService } from '@/classes';

export * from './getUser.service';

export const cachingRedisService = new CachingRedisService();
export const oAuthService = new OAuthService();
