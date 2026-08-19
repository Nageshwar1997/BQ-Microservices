import { ConflictError, NotFoundError } from '@beautinique/backend-classes';
import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TAssignAdminTerritoryZodSchema } from '@beautinique/backend-types';
import type { Request, Response } from 'express';

import { Admin } from '../../models/index.js';
import { getUserById } from '../../services/index.js';

/**
 * MASTER assigns/reassigns which state(s) an `ADMIN` owns (plus optional
 * priority/backup). Upserts - the first assignment is also how an
 * `Admin` normally gets its `assignedStates` populated (the profile
 * document itself already exists by then, auto-created on role promotion -
 * see `WorkerManager`'s `update-role` handler).
 */
export const assignAdminTerritoryController = async (req: Request, res: Response) => {
  const { adminId } = req.params as { adminId: string };
  const body = req.body as TAssignAdminTerritoryZodSchema;

  // `getUserById` throws `NotFoundError` itself if `adminId` doesn't exist.
  const targetUser = await getUserById({ id: adminId });

  if (targetUser.role !== USER_ROLE_MAP.ADMIN) {
    throw new ConflictError(
      `Only an ${USER_ROLE_MAP.ADMIN} can be assigned a state territory (this user is ${targetUser.role})`,
    );
  }

  let backupAdminId = null;

  if (body.backupAdmin) {
    if (body.backupAdmin === adminId) {
      throw new ConflictError('An admin cannot be their own backup');
    }

    const backupProfile = await Admin.findOne({ user: getObjId(body.backupAdmin) })
      .select('_id')
      .lean();

    if (!backupProfile) {
      throw new NotFoundError('Backup admin profile not found - assign them a territory first');
    }

    backupAdminId = backupProfile._id;
  }

  const admin = await Admin.findOneAndUpdate(
    { user: getObjId(adminId) },
    {
      $set: {
        assignedStates: body.states,
        ...(body.priority !== undefined && { priority: Number(body.priority) }),
        ...(body.backupAdmin !== undefined && { backupAdmin: backupAdminId }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // NOTE (Phase 2 / task 2.3): once organization-service's
  // `territory-status-changed` consumer exists, decide the event shape for
  // pure territory/coverage changes (as opposed to a `status` flip, which
  // `updateAdminStatusController` already publishes) and fire it here too -
  // so newly added/removed states get picked up without waiting on a status
  // change. Not wired yet since there's no consumer to validate the shape
  // against.

  res.success({ message: 'Admin territory assigned successfully', data: admin });
};
