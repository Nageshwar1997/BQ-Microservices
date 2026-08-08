import { ConflictError, NotFoundError } from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import { USER_ROLE_MAP } from '@beautinique/shared-constants';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';
import { User } from '../../models/index.js';
import type {
  TPromoteUserRoleBodyZodSchema,
  TPromoteUserRoleParamsZodSchema,
} from '../../types/index.js';
import { getMinimalUser } from '../../utils/index.js';

/**
 * Internal - promotes a `USER` to `SELLER`. Called by organization-service
 * right after it creates a `Seller` profile (see
 * organization-service/SELLER_FEATURE_PLAN.md, Q2). Gated by
 * `authorize([ADMIN, MASTER])` on the route, same as any other admin action.
 */
export const promoteUserRoleController = async (req: Request, res: Response) => {
  const { userId } = req.params as TPromoteUserRoleParamsZodSchema;
  const { role } = req.body as TPromoteUserRoleBodyZodSchema;

  const user = await User.findById(getObjId(userId));

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.role !== USER_ROLE_MAP.USER) {
    throw new ConflictError(`User is already ${user.role}`);
  }

  user.role = role;

  const updatedUser = await user.save();

  const minimalUser = getMinimalUser(updatedUser);

  await redisCacheManager.user.setUser(minimalUser);

  res.success({
    message: 'User promoted to seller successfully',
    data: { _id: minimalUser._id, role: minimalUser.role },
  });
};
