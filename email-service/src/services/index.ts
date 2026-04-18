import { OAuthService } from '@/apis/OAuthService';
import { CacheService, QueueService } from '@/classes';

export * from './getUser.service';

export const cacheService = new CacheService();
export const queueService = new QueueService();
export const oAuthService = new OAuthService();
