import type { TSeller } from '@beautinique/be-zod';
import type { Request } from 'express';
import type { Document, InferSchemaType, Types } from 'mongoose';
import type { SELLER_APPROVAL_STATUS } from '../constants';
import type { userSchema } from '../schemas/user.schema';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface IStrId {
  _id: string;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends InferSchemaType<typeof userSchema>, IId {}

export interface IUserDoc extends IUser, Document {}

export type TMinimalUser = Omit<
  IUser,
  'password' | 'reason' | 'status' | 'createdAt' | 'updatedAt' | '_id'
> &
  IStrId;

export interface ISeller extends Pick<IUser, 'status' | 'reason'> {
  user: TId;
  approvalStatus: (typeof SELLER_APPROVAL_STATUS)[number];
  personalDetails: Omit<TSeller['businessDetails'], 'category'>;
  businessDetails: TSeller['businessDetails'];
  requiredDocuments: Record<'gst' | 'itr' | 'addressProof' | 'geoTagging', string>;
  businessAddress: TSeller['businessAddress'];
}

export interface ISellerDoc extends ISeller, Document {}

export interface IWishlist extends IId, ITimestamp {
  products: TId[];
}

export interface IWishlistDoc extends IWishlist, Document {}

export interface AuthRequest extends Request {
  user?: null | TMinimalUser;
}
