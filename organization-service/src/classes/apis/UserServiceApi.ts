import { HEADERS_MAP } from '@beautinique/backend-constants';
import type { TApiResponse, TUserRole } from '@beautinique/backend-types';

import { envs } from '../../envs/index.js';
import { ApiRequest } from './ApiRequest.js';

interface IPromotedUser {
  _id: string;
  role: TUserRole;
}

/**
 * Talks directly to `user-service` (not through the gateway) - `user-service`
 * owns the `User` document (and its `role`), so `createSellerController`
 * calls here to flip the target user's role from `USER` to `SELLER` once the
 * `Seller` record exists here.
 *
 * Auth: `user-service`'s own `X-Service-Secret` (same perimeter every route
 * already requires), plus the calling admin's `X-User-Id`/`X-User-Role`
 * forwarded through so `user-service`'s `authorize([ADMIN, MASTER])` can do
 * its normal job - see `promoteUserRoleController` on that side.
 */
export class UserServiceApi extends ApiRequest {
  constructor() {
    super(envs.user_service.base_url);
  }

  public async promoteToSeller(userId: string, admin: IPromotedUser) {
    return this.request<TApiResponse<IPromotedUser>>({
      method: 'patch',
      // Must match `METHODS_AND_PATHS.user.promoteRole` in user-service.
      url: `/api/v1/user/${userId}/role`,
      data: { role: 'SELLER' },
      headers: {
        [HEADERS_MAP.serviceSecret]: envs.user_service.secret,
        [HEADERS_MAP.userId]: admin._id,
        [HEADERS_MAP.userRole]: admin.role,
      },
    });
  }
}
