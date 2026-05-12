import type { TRole } from '@beautinique/be-constants';
import type { JobsOptions } from 'bullmq';
import type { Request } from 'express';
import type { Document, Types } from 'mongoose';
import type {
  CATEGORY_LEVELS,
  PRODUCT_STATUSES,
  QUEUE_AND_JOB_NAMES,
  TRY_ON_CATEGORIES,
  TRY_ON_TYPES,
} from '../constants';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

interface IBaseCategory {
  name: string;
  value: string;
}

export interface IL1Category extends IBaseCategory {
  level: (typeof CATEGORY_LEVELS)[0];
  parent: null;
}

export interface IL2Category extends IBaseCategory {
  level: (typeof CATEGORY_LEVELS)[1];
  parent: IL1Category | TId;
}

export interface IL3Category extends IBaseCategory {
  level: (typeof CATEGORY_LEVELS)[2];
  parent: IL2Category | TId;
}

export type TCategory = (IL1Category | IL2Category | IL3Category) & IId;

export type TCategoryDoc = TCategory & Document;

export interface IUser extends IId {
  role: TRole;
}

type TQueue = typeof QUEUE_AND_JOB_NAMES;
export type TQueueKey = keyof TQueue;
type TQueueJobName = { [K in TQueueKey]: { queueName: K; jobName: TQueue[K][number] } }[TQueueKey];

export type IQueueJob<TData = unknown> = TQueueJobName & {
  data: TData;
  options?: JobsOptions;
};

export interface AuthRequest extends Request {
  user?: (IId & { role: TRole }) | null;
}

export type TProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface ILip {
  category: 'LIP';
  type: (typeof TRY_ON_TYPES)['LIP'][number];
}

export interface IEye {
  category: 'EYE';
  type: (typeof TRY_ON_TYPES)['EYE'][number];
}

export interface IHair {
  category: 'HAIR';
  type: (typeof TRY_ON_TYPES)['HAIR'][number];
}

export interface IFace {
  category: 'FACE';
  type: (typeof TRY_ON_TYPES)['FACE'][number];
}

export interface INail {
  category: 'NAIL';
  type: (typeof TRY_ON_TYPES)['NAIL'][number];
}

export interface ISkin {
  category: 'SKIN';
  type: (typeof TRY_ON_TYPES)['SKIN'][number];
}

export type TTryOnCategory = ILip | IEye | IHair | IFace | INail | ISkin;

export type ITryOn = { enabled: false } | ({ enabled: true } & TTryOnCategory);

export interface ITryOnSchema {
  enabled: boolean;
  category?: (typeof TRY_ON_CATEGORIES)[number];
  type?: string;
}

export interface TProductDoc extends Document, IId, ITimestamp {
  title: string;
  slug: string;
  brand: string;
  originalPrice: number;
  sellingPrice: number;
  discount: number;
  totalStock: number;
  description: string;
  howToUse: string;
  ingredients: string;
  additionalDetails: string;
  commonImages: string[];
  variants: TId[];
  category: TId;
  seller: TId;
  approver: TId | null;
  reviews: TId[];
  totalSales: number;
  averageRating: number;
  totalReviews: number;
  status: TProductStatus;
  rejectionReason?: string;
  approvedAt?: Date | null;
  draftExpiresAt?: Date;
  isDeleted: boolean;
  tryOn: ITryOn;
}
