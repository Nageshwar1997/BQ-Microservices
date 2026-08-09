import {
  COUNTRIES,
  COUNTRIES_MAP,
  SELLER_APPROVAL_STATUS_MAP,
  SELLER_APPROVAL_STATUSES,
  SELLER_TYPES,
  STATES_AND_UTS,
  USER_STATUS_MAP,
  USER_STATUSES,
} from '@beautinique/backend-constants';
import { Schema } from 'mongoose';

const businessAddressSchema = new Schema(
  {
    address: { type: String, required: true, minlength: 3 },
    landmark: { type: String, default: '' },
    city: { type: String, required: true, minlength: 2 },
    state: { type: String, required: true, enum: STATES_AND_UTS },
    pinCode: { type: String, required: true, minlength: 6, maxlength: 6 },
    country: { type: String, required: true, enum: COUNTRIES, default: COUNTRIES_MAP.India },
    pan: { type: String, required: true, minlength: 10, maxlength: 10, uppercase: true },
    gst: { type: String, required: true, minlength: 15, maxlength: 15, uppercase: true },
  },
  { versionKey: false, _id: false },
);

const personalDetailsSchema = new Schema(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true, minlength: 10, maxlength: 10 },
  },
  { versionKey: false, _id: false },
);

const businessDetailsSchema = new Schema(
  {
    name: { type: String, required: true, minlength: 2 },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true, minlength: 10, maxlength: 10 },
    category: { type: String, required: true, enum: SELLER_TYPES },
  },
  { versionKey: false, _id: false },
);

const requiredDocumentsSchema = new Schema(
  {
    gst: { type: String, required: true },
    itr: { type: String, required: true },
    geoTagging: { type: String, required: true },
    addressProof: { type: String, required: true },
  },
  { versionKey: false, _id: false },
);

export const sellerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessAddress: businessAddressSchema,
    personalDetails: personalDetailsSchema,
    businessDetails: businessDetailsSchema,
    requiredDocuments: requiredDocumentsSchema,
    approvalStatus: {
      type: String,
      enum: SELLER_APPROVAL_STATUSES,
      default: SELLER_APPROVAL_STATUS_MAP.PENDING,
    },
    status: { type: String, enum: USER_STATUSES, default: USER_STATUS_MAP.ACTIVE },
    reason: { type: String },
  },
  { versionKey: false, timestamps: true },
);

sellerSchema.index({ email: 1 }, { unique: true });
sellerSchema.index({ phoneNumber: 1 }, { unique: true });
