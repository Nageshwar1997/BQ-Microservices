import { ADMIN_STATUS_MAP } from '@beautinique/backend-constants';
import type { Request, Response } from 'express';

import { Admin } from '../../models/index.js';

/**
 * MASTER-only overview - every currently-relevant `Admin` (state coverage,
 * status, load), populated with minimal user info. Returned flat rather
 * than pre-grouped by state - the Territory Management UI (Phase 6) pivots
 * this client-side, since an admin can cover multiple states and a state
 * can have multiple admins.
 *
 * Excludes `INACTIVE` - that's a demoted admin (task 7.1's
 * `demoteAdminController`), kept in the DB for its `statusHistory` audit
 * trail rather than deleted, but it has no territory/role left and would
 * just be a ghost row here forever. Their history stays queryable directly
 * (or from a future Phase 7.3 audit-log view) even though this listing
 * hides them.
 */
export const getTerritoryMapController = async (_req: Request, res: Response) => {
  const admins = await Admin.find({ status: { $ne: ADMIN_STATUS_MAP.INACTIVE } })
    .populate('user', 'firstName lastName email role')
    .sort({ priority: 1, currentPendingLoad: 1 })
    .lean();

  res.success({ message: 'Territory map fetched successfully', data: admins });
};
