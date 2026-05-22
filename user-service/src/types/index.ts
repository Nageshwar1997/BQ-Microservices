import type { Document, InferSchemaType, Types } from 'mongoose';
import type { sellerSchema, userSchema, wishlistSchema } from '../schemas';

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

export interface ISeller extends InferSchemaType<typeof sellerSchema>, IId {}

export interface ISellerDoc extends ISeller, Document {}

export interface IWishlist extends InferSchemaType<typeof wishlistSchema>, IId {}

export interface IWishlistDoc extends IWishlist, Document {}
