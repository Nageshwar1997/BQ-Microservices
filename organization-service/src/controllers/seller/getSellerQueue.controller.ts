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
    throw new AuthorizationError(`Only ${USER_ROLE_MAP.MASTER} can use filter=${requestedFilter}`);
  }

  const query: Record<string, unknown> = { approvalStatus };

  // adminUserId (string) -> that on-leave admin's name, only populated for
  // `filter=mine` - lets the response tag which items are the requester's
  // own vs. ones they're covering (see the mapping below).
  const coveringAdminNames = new Map<string, string>();

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
      .select('adminUserId adminName')
      .lean();

    for (const admin of coveringFor) {
      coveringAdminNames.set(admin.adminUserId.toString(), admin.adminName);
    }

    if (coveringFor.length > 0) {
      orConditions.push({
        assignedAdmin: { $in: coveringFor.map((admin) => admin.adminUserId) },
      });
    }

    query.$or = orConditions;
  }
  // requestedFilter === 'all' -> no extra constraint beyond `approvalStatus`.

  const sellers = await Seller.find(query).sort({ createdAt: -1 }).lean();

  // `coveringFor: null` means it's genuinely the requester's own item (direct
  // assignment, or a SUPER_ADMIN pool item) - UI shows those plain. A
  // non-null value means this item belongs to an on-leave admin the
  // requester is covering for, so the UI can badge it instead of silently
  // mixing it into "my own" items (assignment plan doc, section 7.1).
  const data = sellers.map((seller) => {
    const coveringAdminName = seller.assignedAdmin
      ? coveringAdminNames.get(seller.assignedAdmin.toString())
      : undefined;

    return {
      ...seller,
      coveringFor: coveringAdminName
        ? { adminId: seller.assignedAdmin, adminName: coveringAdminName }
        : null,
    };
  });

  res.success({ message: 'Seller queue fetched successfully', data });
};
