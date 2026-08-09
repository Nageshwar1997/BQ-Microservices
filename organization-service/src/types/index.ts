import type { TUserRole } from '@beautinique/backend-types';
import type { InferSchemaType, Types } from 'mongoose';

import type { contactQuerySchema, sellerSchema } from '../schemas/index.js';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface IUser extends IId {
  role: TUserRole;
}

export type TContactQuery = InferSchemaType<typeof contactQuerySchema> & IId;

export type TSeller = InferSchemaType<typeof sellerSchema> & IId;
