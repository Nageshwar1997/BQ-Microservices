import { AuthorizationError, ConflictError, NotFoundError } from '@beautinique/backend-classes';
import {
  ADMIN_STATUS_MAP,
  TERRITORY_STATUS_CHANGE_REASON_MAP,
  USER_ROLE_MAP,
} from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TUpdateAdminStatusZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { jobProducer } from '../../configs/index.js';
import { Admin } from '../../models/index.js';

// What `statusHistory[].reason` (and the `territory-status-changed` job's
// `reason`) gets set to for each target status.
const REASON_BY_STATUS = {
  [ADMIN_STATUS_MAP.ON_LEAVE]: TERRITORY_STATUS_CHANGE_REASON_MAP.LEAVE,
  [ADMIN_STATUS_MAP.SUSPENDED]: TERRITORY_STATUS_CHANGE_REASON_MAP.SUSPENDED,
  [ADMIN_STATUS_MAP.ACTIVE]: TERRITORY_STATUS_CHANGE_REASON_MAP.REACTIVATED,
} as const;

/**
 * Self-service (ACTIVE/ON_LEAVE) or MASTER (also SUSPENDED - see the
 * Leave vs Suspension design in the assignment plan doc, section 7) status
 * toggle. Fans out one `territory-status-changed` job per state this admin
 * covers so organization-service/product-service refresh their local
 * state->admin Redis mirror - actually reassigning that state's in-flight
 * PENDING items is the consumer's job (Phase 4), not this controller's.
 */
export const updateAdminStatusController = async (req: Request, res: Response) => {
  const requester = getUser(req.user);
  const { adminId } = req.params as { adminId: string };
  const body = req.body as TUpdateAdminStatusZodSchema;

  const isSelf = requester._id === adminId;
  const isMaster = requester.role === USER_ROLE_MAP.MASTER;

  if (!isSelf && !isMaster) {
    throw new AuthorizationError('You can only change your own status');
  }

  if (body.status === ADMIN_STATUS_MAP.SUSPENDED && !isMaster) {
    throw new AuthorizationError(`Only ${USER_ROLE_MAP.MASTER} can suspend an admin`);
  }

  const admin = await Admin.findOne({ user: getObjId(adminId) });

  if (!admin) {
    throw new NotFoundError('Admin profile not found');
  }

  if (admin.status === body.status) {
    throw new ConflictError(`Admin is already ${body.status}`);
  }

  const previousStatus = admin.status;
  const changedAt = new Date();

  admin.status = body.status;
  admin.statusReason = body.status === ADMIN_STATUS_MAP.ACTIVE ? undefined : body.reason;
  admin.statusUpdatedAt = changedAt;
  admin.statusUpdatedBy = getObjId(requester._id);
  admin.leaveUntil =
    body.status === ADMIN_STATUS_MAP.ON_LEAVE && body.leaveUntil ? new Date(body.leaveUntil) : null;

  admin.statusHistory.push({
    status: body.status,
    reason: REASON_BY_STATUS[body.status],
    note:
      body.status === ADMIN_STATUS_MAP.ACTIVE ? `Reactivated from ${previousStatus}` : body.reason,
    changedAt,
    changedBy: getObjId(requester._id),
    ...(admin.leaveUntil && { until: admin.leaveUntil }),
    ...(admin.backupAdmin && { coveredBy: admin.backupAdmin }),
  });

  const updatedAdmin = await admin.save();

  let backupAdminUserId: string | undefined;

  if (updatedAdmin.backupAdmin) {
    const backup = await Admin.findById(updatedAdmin.backupAdmin).select('user').lean();
    backupAdminUserId = backup?.user.toString();
  }

  // SUPER_ADMINs have no `assignedStates` (they're the global backup pool,
  // not state-keyed) - nothing to invalidate downstream for them. Published
  // on `organization-service-queue`, not `user-service-queue` - that's the
  // sole consumer (see `QUEUE_SCHEMA` in `@beautinique/backend-bullmq`).
  await Promise.all(
    updatedAdmin.assignedStates.map((state) =>
      jobProducer.addJob('organization-service-queue', 'territory-status-changed', {
        state,
        adminId,
        previousStatus,
        newStatus: updatedAdmin.status,
        reason: REASON_BY_STATUS[body.status],
        ...(backupAdminUserId && { backupAdminId: backupAdminUserId }),
      }),
    ),
  );

  res.success({ message: 'Admin status updated successfully', data: updatedAdmin });
};
