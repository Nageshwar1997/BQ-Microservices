import { NotFoundError } from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { Admin } from '../../models/index.js';

/**
 * Self-service read - lets an `ADMIN`/`SUPER_ADMIN`/`MASTER` fetch their own
 * `Admin` profile (assigned states, current status, backup, load) without
 * needing to already know their own state (which `getStateAdminsController`
 * would require). Needed for the "My Status" toggle (assignment plan doc,
 * section 10/Phase F.A1) to show the admin's current status before they
 * change it - none of the other admin endpoints are self-readable, they're
 * either MASTER-only (`map`) or require a known state (`state/:state`).
 */
export const getMyAdminController = async (req: Request, res: Response) => {
  const requester = getUser(req.user);

  const admin = await Admin.findOne({ user: getObjId(requester._id) }).lean();

  if (!admin) {
    throw new NotFoundError('Admin profile not found');
  }

  res.success({ message: 'Admin profile fetched successfully', data: admin });
};
