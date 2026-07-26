import type { TAuthProvider } from '@beautinique/backend-types';
import type { AUTH_PROVIDER_MAP } from '@beautinique/shared-constants';
import type { InferSchemaType, Types } from 'mongoose';

import type { sellerSchema, userSchema, wishlistSchema } from '../schemas/index.js';
import type { getMinimalUser } from '../utils/index.js';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface IGoogleProfile {
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface ILinkedinProfile {
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface IGithubProfile {
  name: string;
  email: string;
  avatar_url: string;
}
export interface IGithubEmail {
  email: string;
  primary: boolean;
}

export type TSocialAuthProvider = Exclude<TAuthProvider, typeof AUTH_PROVIDER_MAP.MANUAL>;

export interface IUser extends InferSchemaType<typeof userSchema>, IId {}

export type TMinimalUser = ReturnType<typeof getMinimalUser>;

export interface ISeller extends InferSchemaType<typeof sellerSchema>, IId {}

export interface IWishlist extends InferSchemaType<typeof wishlistSchema>, IId {}
