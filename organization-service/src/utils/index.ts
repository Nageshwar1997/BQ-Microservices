import type { TStateOrUT } from '@beautinique/backend-types';

import { redisCacheManager, userServiceApi } from '../configs/index.js';

/**
 * State -> admin resolution (assignment plan doc, section 6) - cache-aside
 * over `userServiceApi.resolveStateAdmin`, which is the actual source of
 * truth (queries user-service's `Admin` collection directly: this state's
 * `ACTIVE` admins, load-balanced -> their backups -> the `SUPER_ADMIN`
 * pool -> `null`).
 *
 * Propagates a `UserServiceApi` failure (network error, user-service down)
 * rather than swallowing it here - callers decide what "resolution failed"
 * should mean for them (e.g. `createSellerController` treats it as
 * best-effort and leaves the seller unassigned rather than blocking
 * onboarding on it).
 */
export const resolveStateAdmin = async (state: TStateOrUT) => {
  const cached = await redisCacheManager.territory.getStateAdmin(state);

  if (cached) {
    return cached;
  }

  const resolved = await userServiceApi.resolveStateAdmin(state);

  if (resolved) {
    await redisCacheManager.territory.setStateAdmin(state, resolved);
  }

  return resolved;
};
