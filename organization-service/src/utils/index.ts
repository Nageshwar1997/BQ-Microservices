import {
  ADMIN_STATUS_MAP,
  SELLER_APPROVAL_STATUS_MAP,
  TERRITORY_ASSIGNMENT_REASON_MAP,
  USER_ROLE_MAP,
} from '@beautinique/backend-constants';
import type { TStateOrUT } from '@beautinique/backend-types';

import { AdminTerritory, Seller } from '../models/index.js';
import type { IResolvedAdmin, TAdminTerritory, TId } from '../types/index.js';

/**
 * Ranks `candidates` by "who's least busy right now", then `priority` as a
 * tie-break - `currentPendingLoad` isn't mirrored from user-service (see
 * `adminTerritory.schema.ts`), it's computed live from this service's own
 * `Seller` data, which is the actual source of truth for "how many PENDING
 * sellers does this admin currently own".
 */
const pickLeastLoaded = async (
  candidates: Pick<TAdminTerritory, 'adminUserId' | 'adminName' | 'adminEmail' | 'priority'>[],
) => {
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const loads = await Seller.aggregate<{ _id: TId; count: number }>([
    {
      $match: {
        approvalStatus: SELLER_APPROVAL_STATUS_MAP.PENDING,
        assignedAdmin: { $in: candidates.map((candidate) => candidate.adminUserId) },
      },
    },
    { $group: { _id: '$assignedAdmin', count: { $sum: 1 } } },
  ]);

  const loadByAdminId = new Map(loads.map((load) => [load._id.toString(), load.count]));

  return [...candidates].sort((left, right) => {
    const loadDiff =
      (loadByAdminId.get(left.adminUserId.toString()) ?? 0) -
      (loadByAdminId.get(right.adminUserId.toString()) ?? 0);

    return loadDiff !== 0 ? loadDiff : left.priority - right.priority;
  })[0];
};

/**
 * State -> admin resolution (assignment plan doc, section 6) - purely local
 * (no service-to-service HTTP call, no Redis cache-aside needed - it's
 * already a local Mongo read). Order: this state's `ACTIVE` `ADMIN`s
 * (load-balanced) -> their configured backups (if `ACTIVE`) -> the global
 * `SUPER_ADMIN` pool (load-balanced) -> `null` if nobody is available.
 *
 * `AdminTerritory` is a local mirror kept in sync by `WorkerManager`
 * consuming `admin-territory-synced` jobs from user-service - never queried
 * remotely here.
 */
export const resolveStateAdmin = async (state: TStateOrUT): Promise<IResolvedAdmin | null> => {
  /* ---------------- 1. THIS STATE'S ACTIVE ADMINS ---------------- */

  const stateAdmins = await AdminTerritory.find({
    assignedStates: state,
    role: USER_ROLE_MAP.ADMIN,
    status: ADMIN_STATUS_MAP.ACTIVE,
  }).lean();

  const statePick = await pickLeastLoaded(stateAdmins);

  if (statePick) {
    return {
      adminUserId: statePick.adminUserId.toString(),
      adminName: statePick.adminName,
      adminEmail: statePick.adminEmail,
      reason: TERRITORY_ASSIGNMENT_REASON_MAP.STATE_MATCH,
    };
  }

  /* ---------------- 2. THEIR CONFIGURED BACKUPS ---------------- */

  const allStateAdmins = await AdminTerritory.find({
    assignedStates: state,
    role: USER_ROLE_MAP.ADMIN,
  })
    .select('backupAdminUserId')
    .lean();

  const backupIds = [
    ...new Set(
      allStateAdmins
        .map((admin) => admin.backupAdminUserId?.toString())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (backupIds.length > 0) {
    const activeBackups = await AdminTerritory.find({
      adminUserId: { $in: backupIds },
      status: ADMIN_STATUS_MAP.ACTIVE,
    }).lean();

    const backupPick = await pickLeastLoaded(activeBackups);

    if (backupPick) {
      return {
        adminUserId: backupPick.adminUserId.toString(),
        adminName: backupPick.adminName,
        adminEmail: backupPick.adminEmail,
        reason: TERRITORY_ASSIGNMENT_REASON_MAP.BACKUP_COVERAGE,
      };
    }
  }

  /* ---------------- 3. SUPER_ADMIN POOL (global safety net) ---------------- */

  const superAdmins = await AdminTerritory.find({
    role: USER_ROLE_MAP.SUPER_ADMIN,
    status: ADMIN_STATUS_MAP.ACTIVE,
  }).lean();

  const superAdminPick = await pickLeastLoaded(superAdmins);

  if (superAdminPick) {
    return {
      adminUserId: superAdminPick.adminUserId.toString(),
      adminName: superAdminPick.adminName,
      adminEmail: superAdminPick.adminEmail,
      reason: TERRITORY_ASSIGNMENT_REASON_MAP.SUPER_ADMIN_POOL,
    };
  }

  /* ---------------- 4. NOBODY AVAILABLE ---------------- */

  return null;
};
