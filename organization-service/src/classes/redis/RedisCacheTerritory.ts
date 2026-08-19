import type { TStateOrUT } from '@beautinique/backend-types';

import type { IResolvedStateAdmin } from '../apis/UserServiceApi.js';
import { RedisCacheHelper } from './RedisCacheHelper.js';

// Short TTL, not "cache forever + invalidate perfectly" - a bounded self-heal
// window in case a `territory-status-changed` event is ever missed, on top
// of the explicit invalidation the worker already does on every real change.
const TERRITORY_CACHE_TTL_SECONDS = 10 * 60; // 10 minutes

export type ICachedStateAdmin = IResolvedStateAdmin;

/**
 * Cache-aside mirror of `resolveStateAdmin`'s result per state - NOT a
 * replica of user-service's `Admin` collection. On a miss, `resolveStateAdmin`
 * (see `utils/index.ts`) falls back to `UserServiceApi`, which is the real
 * source of truth; this only exists so a normal seller/product submission
 * doesn't cost a cross-service HTTP call every time.
 */
export class RedisCacheTerritory extends RedisCacheHelper {
  private readonly STATE_ADMIN_KEY = 'bq:organization-service:territory:state-admin';

  private getStateAdminKey(state: TStateOrUT) {
    return `${this.STATE_ADMIN_KEY}:${state}`;
  }

  public async getStateAdmin(state: TStateOrUT) {
    return this.getData<ICachedStateAdmin>(this.getStateAdminKey(state));
  }

  public async setStateAdmin(state: TStateOrUT, admin: ICachedStateAdmin) {
    await this.setData(this.getStateAdminKey(state), TERRITORY_CACHE_TTL_SECONDS, admin);
  }

  // Called by the `territory-status-changed` consumer - forces the next
  // `resolveStateAdmin` call for this state to re-resolve from user-service
  // instead of serving a now-stale pick.
  public async invalidateStateAdmin(state: TStateOrUT) {
    await this.deleteData(this.getStateAdminKey(state));
  }
}
