import { ValidationError } from '@beautinique/backend-classes';
import { ADMIN_STATUS_MAP, STATES_AND_UTS } from '@beautinique/backend-constants';
import type { TStateOrUT } from '@beautinique/backend-types';
import type { Request, Response } from 'express';

import { Admin } from '../../models/index.js';

/**
 * Every admin assigned to `:state`, `ACTIVE`-first, then by `priority`.
 * Serves the Territory Management UI (Phase 6) - non-`ACTIVE` admins are
 * still included rather than filtered out, a human needs to see who's on
 * leave/suspended too.
 *
 * Does NOT drive the actual resolution algorithm (assignment plan doc,
 * section 6) - `organization-service`'s `resolveStateAdmin` resolves
 * entirely locally, never calling this endpoint (task 7.2 discovery:
 * an older docstring here claimed otherwise, that was stale).
 *
 * Not sorted by `currentPendingLoad` (task 7.2) - that field is never
 * actually populated anywhere in this service (defined + indexed, but
 * nothing ever increments/decrements it), by design: real PENDING-count
 * load lives in `organization-service`'s own `Seller` collection, computed
 * live there (see the assignment plan doc's "Bade design decisions", point
 * 4). Sorting by an always-`0` field here would've been a silent no-op,
 * not actual load-balancing - `priority` alone is the real, working signal
 * this service has.
 */
export const getStateAdminsController = async (req: Request, res: Response) => {
  const { state } = req.params as { state: string };

  if (!STATES_AND_UTS.includes(state as TStateOrUT)) {
    throw new ValidationError('Invalid state', { fieldErrors: { state: ['Invalid state'] } });
  }

  const admins = await Admin.find({ assignedStates: state as TStateOrUT })
    .populate('user', 'firstName lastName email role')
    .sort({ priority: 1 })
    .lean();

  const sortedAdmins = [
    ...admins.filter((admin) => admin.status === ADMIN_STATUS_MAP.ACTIVE),
    ...admins.filter((admin) => admin.status !== ADMIN_STATUS_MAP.ACTIVE),
  ];

  res.success({ message: `Admins for ${state} fetched successfully`, data: sortedAdmins });
};
