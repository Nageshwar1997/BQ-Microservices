import {
  ADMIN_STATUS_MAP,
  ADMIN_STATUSES,
  STATES_AND_UTS,
  USER_ROLES,
} from '@beautinique/backend-constants';
import { Schema } from 'mongoose';

/**
 * Local read-replica of user-service's `Admin` collection - NOT the source
 * of truth (that's `user-service`'s own DB). Kept in sync entirely via
 * BullMQ jobs (`WorkerManager`'s `admin-territory-synced` handler), never a
 * direct service-to-service call - see the state->admin resolution
 * algorithm in the assignment plan doc, section 6.
 *
 * `currentPendingLoad` is deliberately NOT mirrored here - it's a mutable
 * counter that organization-service itself has the real numbers for (its
 * own `Seller.assignedAdmin` + `approvalStatus: PENDING` counts), so
 * `resolveStateAdmin` computes load-balancing from local `Seller` data
 * instead of trying to keep a cross-service counter in sync.
 */
export const adminTerritorySchema = new Schema(
  {
    adminUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Denormalized - not re-fetched live. See `IAdminTerritorySynced` in
    // `@beautinique/backend-bullmq` for the staleness trade-off.
    adminName: { type: String, required: true },
    adminEmail: { type: String, required: true },
    // `ADMIN` or `SUPER_ADMIN` in practice - `user-service` never syncs `MASTER`.
    role: { type: String, enum: USER_ROLES, required: true },
    assignedStates: { type: [{ type: String, enum: STATES_AND_UTS }], default: [] },
    status: { type: String, enum: ADMIN_STATUSES, default: ADMIN_STATUS_MAP.ACTIVE },
    priority: { type: Number, default: 0 },
    backupAdminUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { versionKey: false, timestamps: true },
);

/* ---------------- RESOLUTION (state -> eligible admins) ---------------- */

adminTerritorySchema.index({ assignedStates: 1, role: 1, status: 1 });

/* ---------------- SUPER_ADMIN POOL ---------------- */

adminTerritorySchema.index({ role: 1, status: 1 });
