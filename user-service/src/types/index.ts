import type { InferSchemaType, Types } from 'mongoose';

import type { sellerSchema, userSchema, wishlistSchema } from '../schemas/index.js';
import type { getMinimalUser } from '../utils/index.js';

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

export interface TApiResponse {
  statusCode: number;
  message: string;
  data?: unknown;
  [key: string]: unknown;
}
