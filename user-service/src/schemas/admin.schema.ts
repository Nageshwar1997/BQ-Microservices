import {
  ADMIN_STATUS_MAP,
  ADMIN_STATUSES,
  STATES_AND_UTS,
  TERRITORY_STATUS_CHANGE_REASONS,
} from '@beautinique/backend-constants';
import { Schema } from 'mongoose';

// Audit trail for every `status` transition - who changed it, why, and (for
// `ON_LEAVE`) who's covering. Mirrors `Seller`'s `history` audit pattern in
// organization-service. Populated by `updateAdminStatusController`.
const adminStatusHistorySchema = new Schema(
  {
    status: { type: String, enum: ADMIN_STATUSES, required: true },
    reason: { type: String, enum: TERRITORY_STATUS_CHANGE_REASONS, required: true },
    note: { type: String, required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Only meaningful when `status` is `ON_LEAVE`.
    until: { type: Date },
    coveredBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { _id: false, versionKey: false },
);

export const adminSchema = new Schema(
  {
    // `user-service` owns the `User` document (role ADMIN/SUPER_ADMIN/MASTER)
    // this profile extends - one profile per admin-capable user.
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Empty for `SUPER_ADMIN`s - they're the global backup pool, not tied to
    // a specific state. See the state->admin resolution algorithm in the
    // assignment plan doc.
    assignedStates: { type: [{ type: String, enum: STATES_AND_UTS }], default: [] },

    // Tie-break/preference among multiple `ACTIVE` admins of the same state -
    // lower resolves first once `currentPendingLoad` ties.
    priority: { type: Number, default: 0 },

    // Explicit backup, per admin - used when this admin is `ON_LEAVE`/`SUSPENDED`
    // and no other same-state admin is `ACTIVE`.
    backupAdmin: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },

    status: { type: String, enum: ADMIN_STATUSES, default: ADMIN_STATUS_MAP.ACTIVE },
    statusReason: { type: String },
    statusUpdatedAt: { type: Date },
    statusUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    // Only set on `ON_LEAVE` - a scheduled sweep auto-reverts to `ACTIVE`
    // once this passes (see `AdminLeaveScheduler`).
    leaveUntil: { type: Date, default: null },

    statusHistory: { type: [adminStatusHistorySchema], default: [] },

    // Denormalized counter - +1 on assignment, -1 on approve/reject/reassign.
    // Drives load-balanced resolution among same-state admins.
    currentPendingLoad: { type: Number, default: 0 },
  },
  { versionKey: false, timestamps: true },
);

/* ---------------- RESOLUTION (state -> eligible admins, load-balanced) ---------------- */

adminSchema.index({ assignedStates: 1, status: 1, currentPendingLoad: 1 });

/* ---------------- SCHEDULED LEAVE SWEEP ---------------- */

adminSchema.index({ status: 1, leaveUntil: 1 });

/* ---------------- TERRITORY MAP / ADMIN LISTING ---------------- */

adminSchema.index({ status: 1 });
