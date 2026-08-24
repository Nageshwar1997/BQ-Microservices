import { ADMIN_STATUS_MAP } from '@beautinique/backend-constants';
import type { Request, Response } from 'express';

import { Admin } from '../../models/index.js';

/**
 * MASTER-only overview - every currently-relevant `Admin` (state coverage,
 * status, config), populated with minimal user info. Returned flat rather
 * than pre-grouped by state - the Territory Management UI (Phase 6) pivots
 * this client-side, since an admin can cover multiple states and a state
 * can have multiple admins.
 *
 * Excludes `INACTIVE` by default - that's a demoted admin (task 7.1's
 * `demoteAdminController`), kept in the DB for its `statusHistory` audit
 * trail rather than deleted, but it has no territory/role left and would
 * just be a ghost row here forever in the day-to-day Territory Management
 * view. `?includeInactive=true` (task 7.3's Audit Log) opts back in - a
 * full history review needs demoted admins' `statusHistory` too, not just
 * currently-relevant ones.
 *
 * `Admin.currentPendingLoad` still comes back on every row (it's part of
 * the document), but don't trust it (task 7.2) - nothing in this service
 * ever writes to it, so it's permanently `0`. Real PENDING-count load
 * lives in `organization-service`'s `Seller` collection, computed live
 * there - the Territory Management UI now sources its "Load" column from
 * `organization-service`'s `?filter=all` seller queue instead, not this
 * field.
 */
export const getTerritoryMapController = async (req: Request, res: Response) => {
  const { includeInactive } = req.query as { includeInactive?: string };

  const query = includeInactive === 'true' ? {} : { status: { $ne: ADMIN_STATUS_MAP.INACTIVE } };

  const admins = await Admin.find(query)
    .populate('user', 'firstName lastName email role')
    .sort({ priority: 1 })
    .lean();

  res.success({ message: 'Territory map fetched successfully', data: admins });
};
