import {
  COUNTRIES,
  COUNTRIES_MAP,
  SELLER_APPROVAL_STATUS_MAP,
  SELLER_APPROVAL_STATUSES,
  SELLER_STATUS_MAP,
  SELLER_STATUSES,
  SELLER_TYPES,
  STATES_AND_UTS,
  TERRITORY_ASSIGNMENT_REASONS,
} from '@beautinique/backend-constants';
import { Schema } from 'mongoose';

const sellerBusinessDetailsSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    type: { type: String, enum: SELLER_TYPES, required: true },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    phoneNumber: { type: String, trim: true, required: true, unique: true },
    gstin: { type: String, trim: true, uppercase: true, required: true, unique: true },
    pan: { type: String, trim: true, uppercase: true, required: true, unique: true },
  },
  { versionKey: false, _id: false },
);

const sellerBankDetailsSchema = new Schema(
  {
    accountHolderName: { type: String, trim: true, required: true },
    accountNumber: { type: String, trim: true, required: true, unique: true },
    ifscCode: { type: String, trim: true, uppercase: true, required: true },
    bankName: { type: String, trim: true, required: true },
  },
  { versionKey: false, _id: false },
);

const sellerAddressSchema = new Schema(
  {
    line1: { type: String, trim: true, required: true },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, required: true },
    state: { type: String, enum: STATES_AND_UTS, required: true },
    pincode: { type: String, trim: true, required: true },
    country: { type: String, enum: COUNTRIES, default: COUNTRIES_MAP.India, required: true },
  },
  { versionKey: false, _id: false },
);

// Image URLs - already uploaded via media-service.
const sellerDocumentsSchema = new Schema(
  {
    id: { type: String, required: true },
    address: { type: String, required: true },
    license: { type: String, required: true },
    pan: { type: String, required: true },
    gst: { type: String, required: true },
    bank: { type: String, required: true },
  },
  { versionKey: false, _id: false },
);

// Audit trail for admin review actions - mirrors product-service's
// `historySchema` on `Product`. Populated by `updateSellerApprovalStatusController`.
const sellerHistorySchema = new Schema(
  {
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectReason: { type: String },
    suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    suspendedAt: { type: Date },
    suspendReason: { type: String },
  },
  { _id: false, versionKey: false },
);

// One entry per (re)assignment - audit trail for "who owned this seller,
// when, and why" (assignment plan doc, section 6/7). Populated by
// `createSellerController` (shadow mode: stamped but not yet enforced -
// see task 2.5) and, later, by reassignment on admin `SUSPENDED`/leave
// (Phase 4).
const sellerAssignedAdminHistorySchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, required: true },
    reason: { type: String, enum: TERRITORY_ASSIGNMENT_REASONS, required: true },
  },
  { _id: false, versionKey: false },
);

export const sellerSchema = new Schema(
  {
    // `user-service` owns the actual `User` document (and its `role`) - this
    // just references it by id. Also the applicant/creator - self-service
    // only, see `createSellerController`.
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessDetails: { type: sellerBusinessDetailsSchema, required: true },
    bankDetails: { type: sellerBankDetailsSchema, required: true },
    address: { type: sellerAddressSchema, required: true },
    documents: { type: sellerDocumentsSchema, required: true },
    // Starts `PENDING` - `updateSellerApprovalStatusController` is what
    // flips it (and, on approval, promotes the user's role).
    approvalStatus: {
      type: String,
      enum: SELLER_APPROVAL_STATUSES,
      default: SELLER_APPROVAL_STATUS_MAP.PENDING,
    },
    status: { type: String, enum: SELLER_STATUSES, default: SELLER_STATUS_MAP.ACTIVE },
    history: sellerHistorySchema,
    // Resolved from `address.state` via `resolveStateAdmin` - the admin who
    // handles this seller's approval, product reviews, suspension, etc.
    // `null` when resolution failed/no admin was available yet (see
    // `createSellerController`) - `null` is NOT the same as "no ownership
    // check needed", it means "needs manual assignment".
    assignedAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedAdminHistory: { type: [sellerAssignedAdminHistorySchema], default: [] },
    // Denormalized from `assignedAdminHistory[last].reason === SUPER_ADMIN_POOL`
    // - avoids inspecting array history at query/ownership-check time. `true`
    // means ANY currently-`ACTIVE` SUPER_ADMIN can act on this seller, not
    // just `assignedAdmin` specifically (see the ownership middleware and
    // "My Queue" - SUPER_ADMINs form a shared covering pool, not individually
    // owned territory).
    assignedViaSuperAdminPool: { type: Boolean, default: false },
  },
  { versionKey: false, timestamps: true },
);

/* ---------------- ADMIN LISTING ---------------- */

sellerSchema.index({ approvalStatus: 1, createdAt: -1 });

sellerSchema.index({ status: 1, createdAt: -1 });

/* ---------------- "MY QUEUE" (per-admin ownership) ---------------- */

sellerSchema.index({ assignedAdmin: 1, approvalStatus: 1, createdAt: -1 });

sellerSchema.index({ assignedViaSuperAdminPool: 1, approvalStatus: 1, createdAt: -1 });
