import { AuthorizationError, NotFoundError } from '@beautinique/backend-classes';
import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';

import { logger, redisCacheManager } from '../configs/index.js';
import { Product } from '../models/index.js';

/**
 * Runs after the route's role-level `authorize()` gate - that only checks
 * "is this an ADMIN/SUPER_ADMIN/MASTER", this checks "is it THIS product's
 * seller's assigned admin" (assignment plan doc's product-service row:
 * "sirf ek chhota cached lookup use karega, naya logic duplicate nahi
 * karega" - deliberately a thinner check than
 * `organization-service`'s `authorizeSellerOwnership`).
 *
 * - `MASTER` always bypasses (full override, per design).
 * - Otherwise, the product's seller's cached `assignedAdminId`
 *   (`RedisCacheAssignment`, kept fresh by `WorkerManager` - see Phase 5.1)
 *   must exactly match the requester.
 *
 * ⚠️ Known scope-cut (not duplicated here on purpose): unlike
 * `authorizeSellerOwnership`, this does NOT re-derive `SUPER_ADMIN`
 * pool-coverage or `ON_LEAVE` backup-coverage - both need
 * `organization-service`'s live `AdminTerritory` status, which this service
 * doesn't mirror. In practice this only matters while the exact assigned
 * admin is on leave - their backup can still act on the seller's
 * application (organization-service) but not yet on their products here.
 * Flagged for a later session if this gap turns out to matter in practice.
 */
export const authorizeProductOwnership = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const requester = getUser(req.user);

    if (requester.role === USER_ROLE_MAP.MASTER) {
      next();
      return;
    }

    const { productId } = req.params as { productId: string };

    const product = await Product.findById(getObjId(productId)).select('seller').lean();

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const assignment = await redisCacheManager.assignment.getUserAdmin(product.seller.toString());

    if (!assignment) {
      logger.warn(
        `⚠️ No cached admin assignment for seller-user ${product.seller.toString()} while reviewing product ${productId}`,
      );
    }

    if (assignment?.assignedAdminId !== requester._id.toString()) {
      throw new AuthorizationError('You are not authorized to act on this product');
    }

    next();
  } catch (error) {
    next(error);
  }
};
