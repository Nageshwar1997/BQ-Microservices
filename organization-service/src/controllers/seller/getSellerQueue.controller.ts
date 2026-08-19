import { AuthorizationError } from '@beautinique/backend-classes';
import {
  ADMIN_STATUS_MAP,
  SELLER_APPROVAL_STATUS_MAP,
  USER_ROLE_MAP,
} from '@beautinique/backend-constants';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { AdminTerritory, Seller } from '../../models/index.js';

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
const VALID_FILTERS = ['mine', 'all', 'unassigned'] as const;

/**
 * Replaces the old "every ADMIN/MASTER sees every PENDING seller" listing
 * (assignment plan doc, section 8) - defaults to "my queue": this admin's
 * `assignedAdmin`, plus (a) the `SUPER_ADMIN` pool queue for a `SUPER_ADMIN`,
 * and (b) anyone they're currently the configured backup for while that
 * admin is `ON_LEAVE` (the "covering" model, section 7.1 - same coverage
 * rule as `authorizeSellerOwnership`). `?filter=all` / `?filter=unassigned`
 * are MASTER-only - a state `ADMIN`/`SUPER_ADMIN` has no legitimate reason
 * to see other admins' or orphaned queues.
 */
export const getSellerQueueController = async (req: Request, res: Response) => {
  const requester = getUser(req.user);
  const { status, filter } = req.query as { status?: string; filter?: string };

  const approvalStatus = VALID_STATUSES.includes(status as never)
    ? (status as (typeof VALID_STATUSES)[number])
    : SELLER_APPROVAL_STATUS_MAP.PENDING;

  const requestedFilter = VALID_FILTERS.includes(filter as never)
    ? (filter as (typeof VALID_FILTERS)[number])
    : 'mine';

  if (requestedFilter !== 'mine' && requester.role !== USER_ROLE_MAP.MASTER) {
    throw new AuthorizationError(
      `Only ${USER_ROLE_MAP.MASTER} can use filter=${requestedFilter}`,
    );
  }

  const query: Record<string, unknown> = { approvalStatus };

  if (requestedFilter === 'unassigned') {
    query.assignedAdmin = null;
  } else if (requestedFilter === 'mine') {
    const orConditions: Record<string, unknown>[] = [{ assignedAdmin: requester._id }];

    if (requester.role === USER_ROLE_MAP.SUPER_ADMIN) {
      orConditions.push({ assignedViaSuperAdminPool: true });
    }

    const coveringFor = await AdminTerritory.find({
      backupAdminUserId: requester._id,
      status: ADMIN_STATUS_MAP.ON_LEAVE,
    })
      .select('adminUserId')
      .lean();

    if (coveringFor.length > 0) {
      orConditions.push({
        assignedAdmin: { $in: coveringFor.map((admin) => admin.adminUserId) },
      });
    }

    query.$or = orConditions;
  }
  // requestedFilter === 'all' -> no extra constraint beyond `approvalStatus`.

  const sellers = await Seller.find(query).sort({ createdAt: -1 }).lean();

  res.success({ message: 'Seller queue fetched successfully', data: sellers });
};
