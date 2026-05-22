import type { InferSchemaType, Types } from 'mongoose';
import type { sellerSchema, userSchema, wishlistSchema } from '../schemas';
import type { getMinimalUser } from '../utils';

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

export type TMinimalUser = ReturnType<typeof getMinimalUser>;

export interface ISeller extends InferSchemaType<typeof sellerSchema>, IId {}

export interface IWishlist extends InferSchemaType<typeof wishlistSchema>, IId {}
