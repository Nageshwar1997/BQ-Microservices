import type { TUserRole } from '@beautinique/backend-types';
import type {
  draftSellerDetailsZodSchema,
  draftSellerStepBodyZodSchema,
  TInfer,
} from '@beautinique/backend-zod';
import type { InferSchemaType, Types } from 'mongoose';

import type { contactQuerySchema, createSellerZodSchema, sellerSchema } from '../schemas/index.js';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface IUser extends IId {
  role: TUserRole;
}

export type TContactQuery = InferSchemaType<typeof contactQuerySchema> & IId;

export type TSeller = InferSchemaType<typeof sellerSchema> & IId;

export type TCreateSellerZodSchema = TInfer<typeof createSellerZodSchema>;

export type TDraftSellerStepBodyZodSchema = TInfer<typeof draftSellerStepBodyZodSchema>;

export type TDraftSellerDetailsZodSchema = TInfer<typeof draftSellerDetailsZodSchema>;
