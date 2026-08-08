import {
  COUNTRIES,
  COUNTRIES_MAP,
  SELLER_APPROVAL_STATUS_MAP,
  SELLER_APPROVAL_STATUSES,
  SELLER_STATUS_MAP,
  SELLER_STATUSES,
  SELLER_TYPES,
  STATES_AND_UTS,
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

export const sellerSchema = new Schema(
  {
    // `user-service` owns the actual `User` document (and its `role`) - this
    // just references it by id, see `createSellerController`.
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessDetails: { type: sellerBusinessDetailsSchema, required: true },
    bankDetails: { type: sellerBankDetailsSchema, required: true },
    address: { type: sellerAddressSchema, required: true },
    documents: { type: sellerDocumentsSchema, required: true },
    approvalStatus: {
      type: String,
      enum: SELLER_APPROVAL_STATUSES,
      default: SELLER_APPROVAL_STATUS_MAP.APPROVED,
    },
    status: { type: String, enum: SELLER_STATUSES, default: SELLER_STATUS_MAP.ACTIVE },
    // The admin/master who created this record - audit trail.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Populated if ever suspended/rejected later.
    reason: { type: String, trim: true },
  },
  { versionKey: false, timestamps: true },
);

/* ---------------- ADMIN LISTING ---------------- */

sellerSchema.index({ approvalStatus: 1, createdAt: -1 });

sellerSchema.index({ status: 1, createdAt: -1 });
