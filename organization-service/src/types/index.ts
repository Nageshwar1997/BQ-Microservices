import type { TUserRole } from '@beautinique/backend-types';
import type { InferSchemaType, Types } from 'mongoose';

import type { CONTACT_QUERY_STATUS, CONTACT_QUERY_TYPES } from '../constants/index.js';
import type { contactQuerySchema } from '../schemas/index.js';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface IUser extends IId {
  role: TUserRole;
}

export type TContactQueryType = (typeof CONTACT_QUERY_TYPES)[number];

export type TContactQueryStatus = (typeof CONTACT_QUERY_STATUS)[number];

export type TContactQuery = InferSchemaType<typeof contactQuerySchema> & IId;

export interface IListContactQueriesQuery {
  page?: string;
  limit?: string;
  status?: TContactQueryStatus;
  queryType?: TContactQueryType;
}
