import type { TAuthProvider, TRole } from '@beautinique/be-constants';
import type { TEmail, TRegister, TSeller } from '@beautinique/be-zod';
import type { JobsOptions } from 'bullmq';
import type { Request } from 'express';
import type { Document, Types } from 'mongoose';
import type { QUEUE_AND_JOB_NAMES, SELLER_APPROVAL_STATUS, USER_STATUS } from '../constants';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export type TUser = TEmail &
  Omit<TRegister, 'confirmPassword' | 'otp'> & {
    avatar?: string;
    role: TRole;
    providers: TAuthProvider[];
    status: (typeof USER_STATUS)[number];
    reason?: string | null;
  };

export interface IUser extends TUser, IId, ITimestamp {}

export type TMinimalUser = Omit<IUser, 'password' | 'reason' | 'status'>;

export interface IUserDoc extends IUser, Document {}

export interface ISeller extends Pick<IUser, 'status' | 'reason'> {
  user: TId;
  approvalStatus: (typeof SELLER_APPROVAL_STATUS)[number];
  personalDetails: Omit<TSeller['businessDetails'], 'category'>;
  businessDetails: TSeller['businessDetails'];
  requiredDocuments: Record<'gst' | 'itr' | 'addressProof' | 'geoTagging', string>;
  businessAddress: TSeller['businessAddress'];
}

export interface ISellerDoc extends ISeller, Document {}

export interface IWishlist extends IId, ITimestamp {
  products: TId[];
}

export interface IWishlistDoc extends IWishlist, Document {}

type TQueue = typeof QUEUE_AND_JOB_NAMES;
export type TQueueKey = keyof TQueue;
type TQueueJobName = { [K in TQueueKey]: { queueName: K; jobName: TQueue[K][number] } }[TQueueKey];

export type IQueueJob<TData = unknown> = TQueueJobName & {
  data: TData;
  options?: JobsOptions;
};

export interface AuthRequest extends Request {
  user?: null | TMinimalUser;
}
