import type { TTerritoryAssignmentReason, TUserRole } from '@beautinique/backend-types';
import type { InferSchemaType, Types } from 'mongoose';

import type { adminTerritorySchema, contactQuerySchema, sellerSchema } from '../schemas/index.js';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface IUser extends IId {
  role: TUserRole;
}

export type TContactQuery = InferSchemaType<typeof contactQuerySchema> & IId;

export type TSeller = InferSchemaType<typeof sellerSchema> & IId;

export type TAdminTerritory = InferSchemaType<typeof adminTerritorySchema> & IId;

/** `resolveStateAdmin`'s return shape - `null` means "nobody available, needs manual assignment". */
export interface IResolvedAdmin extends Pick<TAdminTerritory, 'adminName' | 'adminEmail'> {
  adminUserId: string;
  reason: TTerritoryAssignmentReason;
}
