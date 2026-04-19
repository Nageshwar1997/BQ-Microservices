import { CacheService, QueueService, SocialAuth } from '@/classes';

export * from './getUser.service';

export const cacheService = new CacheService();
export const queueService = new QueueService();

export const socialAuth = new SocialAuth();
