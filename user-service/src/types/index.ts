import type { TAuthProvider, TUserRole } from '@beautinique/backend-types';
import type { TInfer } from '@beautinique/backend-zod';
import type { AUTH_PROVIDER_MAP } from '@beautinique/shared-constants';
import type { InferSchemaType, Types } from 'mongoose';

import type {
  promoteUserRoleBodyZodSchema,
  promoteUserRoleParamsZodSchema,
  sellerSchema,
  userSchema,
  wishlistSchema,
} from '../schemas/index.js';

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

export interface IMinimalUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatar: string;
  role: TUserRole;
  providers: TAuthProvider[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISeller extends InferSchemaType<typeof sellerSchema>, IId {}

export interface IWishlist extends InferSchemaType<typeof wishlistSchema>, IId {}

export type TPromoteUserRoleParamsZodSchema = TInfer<typeof promoteUserRoleParamsZodSchema>;

export type TPromoteUserRoleBodyZodSchema = TInfer<typeof promoteUserRoleBodyZodSchema>;
