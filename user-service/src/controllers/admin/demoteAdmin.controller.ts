import { ConflictError, NotFoundError } from '@beautinique/backend-classes';
import {
  ADMIN_STATUS_MAP,
  TERRITORY_STATUS_CHANGE_REASON_MAP,
  USER_ROLE_MAP,
} from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';
import { Admin, User } from '../../models/index.js';
import { getUserById } from '../../services/index.js';
import { getMinimalUser, publishAdminTerritorySync } from '../../utils/index.js';

/**
 * MASTER-only. Demotes an `ADMIN`/`SUPER_ADMIN` back to a plain `USER` and
 * cleans up their territory - the missing piece task 7.1 flagged (see the
 * comment on `WorkerManager`'s `update-role` handler): that generic job just
 * flips `role`, it never touches the `Admin` profile or tells
 * organization-service's mirror anything changed.
 *
 * Guard (assignment plan doc, section 11 - "block until bulk-reassign"):
 * only allowed once the admin is already `SUSPENDED` - suspension is what
 * actually bulk-reassigns their `PENDING` work away (Phase 4.2), so by the
 * time MASTER demotes them there should be nothing left pointing at them.
 * This isn't a live cross-service count check (organization-service's
 * `Seller`/product-service's `Product` collections aren't visible from here
 * without a peer HTTP call, which this codebase deliberately avoids) - it's
 * enforced by requiring the one status transition that's already known to
 * trigger that cleanup.
 *
 * Optional `?reassignTo=<adminUserId>` - hands the vacated states straight
 * to another ACTIVE admin in the same request, so a territory is never left
 * uncovered longer than it has to be (falls back to the `SUPER_ADMIN` pool
 * either way, same as any other unassigned state, if MASTER skips this).
 */
export const demoteAdminController = async (req: Request, res: Response) => {
  const requester = getUser(req.user);
  const { adminId } = req.params as { adminId: string };
  const { reassignTo } = req.query as { reassignTo?: string };

  const targetUser = await getUserById({ id: adminId });

  if (targetUser.role !== USER_ROLE_MAP.ADMIN && targetUser.role !== USER_ROLE_MAP.SUPER_ADMIN) {
    throw new ConflictError(`${targetUser.role} is not an admin - nothing to demote`);
  }

  const admin = await Admin.findOne({ user: getObjId(adminId) });

  if (!admin) {
    throw new NotFoundError('Admin profile not found');
  }

  if (admin.status !== ADMIN_STATUS_MAP.SUSPENDED) {
    throw new ConflictError(
      'Suspend this admin first - suspension is what reassigns their pending work away. Demoting only proceeds once that has happened.',
    );
  }

  if (reassignTo && reassignTo === adminId) {
    throw new ConflictError('Cannot reassign a vacated territory to the admin being demoted');
  }

  let replacementAdmin: Awaited<ReturnType<typeof Admin.findOne>> = null;

  if (reassignTo) {
    const replacementUser = await getUserById({ id: reassignTo });

    if (replacementUser.role !== USER_ROLE_MAP.ADMIN) {
      throw new ConflictError(
        `${replacementUser.role} cannot receive a state territory (only ${USER_ROLE_MAP.ADMIN} can)`,
      );
    }

    replacementAdmin = await Admin.findOne({ user: getObjId(reassignTo) });

    if (!replacementAdmin) {
      throw new NotFoundError(
        'Replacement admin profile not found - assign them a territory first',
      );
    }
  }

  const vacatedStates = admin.assignedStates;
  const changedAt = new Date();

  // 1. Empty out the territory + publish the sync WHILE the user is still
  // ADMIN/SUPER_ADMIN - `publishAdminTerritorySync` no-ops once the role
  // changes away from those (by design, so it never mistakes a plain USER
  // for territory-relevant), so this has to happen before step 4 below,
  // not after.
  admin.assignedStates = [];
  admin.backupAdmin = null;
  admin.status = ADMIN_STATUS_MAP.INACTIVE;
  admin.statusReason = 'Demoted by MASTER';
  admin.statusUpdatedAt = changedAt;
  admin.statusUpdatedBy = getObjId(requester._id);
  admin.statusHistory.push({
    status: ADMIN_STATUS_MAP.INACTIVE,
    // No dedicated "DEMOTED" reason exists yet (would need a
    // `BQ-Packages` republish for one new enum value) - `SUSPENDED` is the
    // closest existing fit, `note` carries the real explanation.
    reason: TERRITORY_STATUS_CHANGE_REASON_MAP.SUSPENDED,
    note: 'Demoted - role changed to USER',
    changedAt,
    changedBy: getObjId(requester._id),
  });

  const updatedAdmin = await admin.save();

  await publishAdminTerritorySync(updatedAdmin);

  // 2. Anyone else who had this admin configured as their backup now points
  // at nobody - clear it rather than leaving a dangling reference.
  await Admin.updateMany({ backupAdmin: admin._id }, { $set: { backupAdmin: null } });

  // 3. Hand the vacated states to the replacement, if one was given.
  if (replacementAdmin && vacatedStates.length > 0) {
    replacementAdmin.assignedStates = Array.from(
      new Set([...replacementAdmin.assignedStates, ...vacatedStates]),
    );

    const updatedReplacement = await replacementAdmin.save();

    await publishAdminTerritorySync(updatedReplacement);
  }

  // 4. Only now flip the role - after the emptied snapshot already synced.
  const demotedUser = await User.findById(getObjId(adminId));

  if (!demotedUser) {
    throw new NotFoundError('User not found');
  }

  demotedUser.role = USER_ROLE_MAP.USER;

  const savedUser = await demotedUser.save();

  await redisCacheManager.user.setUser(getMinimalUser(savedUser));

  res.success({
    message: 'Admin demoted successfully',
    data: {
      vacatedStates,
      reassignedTo: replacementAdmin ? reassignTo : null,
    },
  });
};
