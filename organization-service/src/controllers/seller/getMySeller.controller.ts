import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { AdminTerritory, Seller } from '../../models/index.js';

/**
 * Self-service read - lets the applicant (any `USER`, not just already-a-SELLER)
 * check their own submitted application's status (PENDING/APPROVED/REJECTED)
 * without needing admin/queue access. `data: null` (not a 404) when they
 * haven't applied yet - that's the expected/common case for a plain `USER`,
 * not an error (mirrors `getDraftSellerController`'s same null-is-fine shape).
 *
 * Also used by `BQ-Seller` (already-APPROVED sellers) to show "your assigned
 * admin" - `assignedAdmin` on its own is just an ObjectId, so it's resolved
 * into display-ready name/email/status here from the local `AdminTerritory`
 * mirror (never a live user-service call, same as `resolveStateAdmin`).
 * Best-effort: `null` whenever there's nothing to resolve (no admin assigned
 * yet, or the mirror hasn't synced that admin) - the seller record is still
 * returned either way.
 */
export const getMySellerController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const seller = await Seller.findOne({ user: userId }).lean();

  let assignedAdminInfo = null;

  if (seller?.assignedAdmin) {
    const admin = await AdminTerritory.findOne({ adminUserId: seller.assignedAdmin })
      .select('adminName adminEmail status')
      .lean();

    if (admin) {
      assignedAdminInfo = { name: admin.adminName, email: admin.adminEmail, status: admin.status };
    }
  }

  res.success({
    message: 'Your seller application fetched successfully',
    data: seller ? { ...seller, assignedAdminInfo } : null,
  });
};
