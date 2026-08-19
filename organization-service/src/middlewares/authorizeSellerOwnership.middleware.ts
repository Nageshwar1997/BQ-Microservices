import { AuthorizationError, NotFoundError } from '@beautinique/backend-classes';
import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';

import { Seller } from '../models/index.js';

/**
 * Runs after the route's role-level `authorize()` gate - that only checks
 * "is this an ADMIN/SUPER_ADMIN/MASTER", this checks "is it THIS seller's
 * assigned admin". Replaces the old blanket "any ADMIN/MASTER can act on
 * any seller" behavior (assignment plan doc, section 1/8).
 *
 * - `MASTER` always bypasses (full override, per design).
 * - The seller's `assignedAdmin` (exact match) always passes.
 * - A `SUPER_ADMIN` also passes if this seller was resolved via the
 *   `SUPER_ADMIN` pool (`assignedViaSuperAdminPool`) - the pool is a shared
 *   covering group, not individually-owned territory, so any currently
 *   `ACTIVE` `SUPER_ADMIN` can pick it up, not just whoever it first landed on.
 * - Everyone else (including a state `ADMIN` who isn't this seller's owner) - 403.
 */
export const authorizeSellerOwnership = async (
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

    const { sellerId } = req.params as { sellerId: string };

    const seller = await Seller.findById(getObjId(sellerId))
      .select('assignedAdmin assignedViaSuperAdminPool')
      .lean();

    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    const isOwner = seller.assignedAdmin?.toString() === requester._id.toString();
    const isPoolCoverage =
      requester.role === USER_ROLE_MAP.SUPER_ADMIN && seller.assignedViaSuperAdminPool;

    if (!isOwner && !isPoolCoverage) {
      throw new AuthorizationError('You are not authorized to act on this seller');
    }

    next();
  } catch (error) {
    next(error);
  }
};
