import { RedisCacheHelper } from './RedisCacheHelper.js';

export interface ICachedSellerAdminAssignment {
  assignedAdminId: string;
  sellerId: string;
}

/**
 * Mirrors `organization-service`'s `Seller.assignedAdmin` for THIS
 * service's own ownership checks (product review routes, see
 * `authorizeProductOwnership.middleware.ts`) - never a source of truth,
 * just a local cache kept fresh by `WorkerManager` consuming
 * `product-service-queue.seller-admin-assigned` (published on both initial
 * assignment and reassignment - Phase 5.1). No TTL - the cache is only ever
 * as stale as the last real assignment event, same reasoning as
 * `RedisCacheCategory`'s categories cache.
 */
export class RedisCacheAssignment extends RedisCacheHelper {
  private key(userId: string): string {
    return `assignment:user-admin:${userId}`;
  }

  public async setUserAdmin(userId: string, assignment: ICachedSellerAdminAssignment) {
    await this.setPersistentData(this.key(userId), assignment);
  }

  public async getUserAdmin(userId: string): Promise<ICachedSellerAdminAssignment | null> {
    return this.getData<ICachedSellerAdminAssignment>(this.key(userId));
  }
}
