import { ValidationError } from '@beautinique/backend-classes';
import { ADMIN_STATUS_MAP, STATES_AND_UTS } from '@beautinique/backend-constants';
import type { TStateOrUT } from '@beautinique/backend-types';
import type { Request, Response } from 'express';

import { Admin } from '../../models/index.js';

/**
 * Every admin assigned to `:state`, `ACTIVE`-first, then by
 * `currentPendingLoad`/`priority` - the same ordering the state->admin
 * resolution algorithm (assignment plan doc, section 6) picks from. Serves
 * both the internal resolver (Phase 2) and the Territory Management UI
 * (Phase 6), which is why non-`ACTIVE` admins are still included rather
 * than filtered out - a human needs to see who's on leave/suspended too.
 */
export const getStateAdminsController = async (req: Request, res: Response) => {
  const { state } = req.params as { state: string };

  if (!STATES_AND_UTS.includes(state as TStateOrUT)) {
    throw new ValidationError('Invalid state', { fieldErrors: { state: ['Invalid state'] } });
  }

  const admins = await Admin.find({ assignedStates: state as TStateOrUT })
    .populate('user', 'firstName lastName email role')
    .sort({ currentPendingLoad: 1, priority: 1 })
    .lean();

  const sortedAdmins = [
    ...admins.filter((admin) => admin.status === ADMIN_STATUS_MAP.ACTIVE),
    ...admins.filter((admin) => admin.status !== ADMIN_STATUS_MAP.ACTIVE),
  ];

  res.success({ message: `Admins for ${state} fetched successfully`, data: sortedAdmins });
};
