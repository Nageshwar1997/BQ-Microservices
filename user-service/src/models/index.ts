import { SELLER_APPROVAL_STATUS, USER_STATUS } from '@/constants';
import type { ISeller, IUser, IWishlist } from '@/types';
import { COUNTRIES, ROLES, SELLER_TYPES, STATES_AND_UTS } from '@beautinique/be-constants';
import { Schema, model } from 'mongoose';

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String, default: '', trim: true },
    role: { type: String, enum: ROLES, default: 'USER' },
    password: { type: String, trim: true },
    providers: { type: [String], default: ['MANUAL'] },
    status: { type: String, enum: USER_STATUS, default: 'ACTIVE' },
    reason: { type: String },
  },
  { versionKey: false, timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index(
  { phoneNumber: 1 },
  { unique: true, partialFilterExpression: { phoneNumber: { $ne: '' } } },
);
userSchema.index({ role: 1 });

const businessAddressSchema = new Schema<ISeller['businessAddress']>(
  {
    address: { type: String, required: true, minlength: 3 },
    landmark: { type: String, default: '' },
    city: { type: String, required: true, minlength: 2 },
    state: { type: String, required: true, enum: STATES_AND_UTS },
    pinCode: { type: String, required: true, minlength: 6, maxlength: 6 },
    country: { type: String, required: true, enum: COUNTRIES, default: 'India' },
    pan: { type: String, required: true, minlength: 10, maxlength: 10, uppercase: true },
    gst: { type: String, required: true, minlength: 15, maxlength: 15, uppercase: true },
  },
  { versionKey: false, _id: false },
);

const personalDetailsSchema = new Schema<ISeller['personalDetails']>(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true, minlength: 10, maxlength: 10 },
  },
  { versionKey: false, _id: false },
);

const businessDetailsSchema = new Schema<ISeller['businessDetails']>(
  {
    name: { type: String, required: true, minlength: 2 },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true, minlength: 10, maxlength: 10 },
    category: { type: String, required: true, enum: SELLER_TYPES },
  },
  { versionKey: false, _id: false },
);

const requiredDocumentsSchema = new Schema<ISeller['requiredDocuments']>(
  {
    gst: { type: String, required: true },
    itr: { type: String, required: true },
    geoTagging: { type: String, required: true },
    addressProof: { type: String, required: true },
  },
  { versionKey: false, _id: false },
);

const sellerSchema = new Schema<ISeller>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessAddress: businessAddressSchema,
    personalDetails: personalDetailsSchema,
    businessDetails: businessDetailsSchema,
    requiredDocuments: requiredDocumentsSchema,
    approvalStatus: { type: String, enum: SELLER_APPROVAL_STATUS, default: 'PENDING' },
    status: { type: String, enum: USER_STATUS, default: 'ACTIVE' },
    reason: { type: String },
  },
  { versionKey: false, timestamps: true },
);

sellerSchema.index({ email: 1 }, { unique: true });
sellerSchema.index({ phoneNumber: 1 }, { unique: true });

const wishlistSchema = new Schema<IWishlist>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  { versionKey: false, timestamps: true },
);

export const User = model<IUser>('User', userSchema);

export const Seller = model<ISeller>('Seller', sellerSchema);

export const Wishlist = model<IWishlist>('Wishlist', wishlistSchema);
