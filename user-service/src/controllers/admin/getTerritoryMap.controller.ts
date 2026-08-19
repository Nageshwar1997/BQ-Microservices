import type { Request, Response } from 'express';

import { Admin } from '../../models/index.js';

/**
 * MASTER-only overview - every `Admin` (state coverage, status,
 * load), populated with minimal user info. Returned flat rather than
 * pre-grouped by state - the Territory Management UI (Phase 6) pivots this
 * client-side, since an admin can cover multiple states and a state can
 * have multiple admins.
 */
export const getTerritoryMapController = async (_req: Request, res: Response) => {
  const admins = await Admin.find()
    .populate('user', 'firstName lastName email role')
    .sort({ priority: 1, currentPendingLoad: 1 })
    .lean();

  res.success({ message: 'Territory map fetched successfully', data: admins });
};
