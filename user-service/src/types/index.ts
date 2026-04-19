import type { QUEUE_AND_JOB_NAMES, SELLER_APPROVAL_STATUS, USER_STATUS } from '@/constants';
import type { TAuthProvider, TRole } from '@beautinique/be-constants';
import type { TRegister, TSellerRequest } from '@beautinique/be-zod';
import type { JobsOptions } from 'bullmq';
import type { Document, Types } from 'mongoose';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export type TUser = Omit<TRegister, 'confirmPassword' | 'otp'> & {
  avatar?: string;
  role: TRole;
  providers: TAuthProvider[];
  status: (typeof USER_STATUS)[number];
  reason?: string | null;
};

export interface IUser extends TUser, IId, ITimestamp, Document {}

export interface ISeller extends IId, ITimestamp, Document, Pick<TUser, 'status' | 'reason'> {
  user: TId;
  approvalStatus: (typeof SELLER_APPROVAL_STATUS)[number];
  personalDetails: Omit<TSellerRequest['businessDetails'], 'category'>;
  businessDetails: TSellerRequest['businessDetails'];
  requiredDocuments: Record<'gst' | 'itr' | 'addressProof' | 'geoTagging', string>;
  businessAddress: TSellerRequest['businessAddress'];
}

export interface IWishlist extends IId, ITimestamp, Document {
  products: TId[];
}

type TQueue = typeof QUEUE_AND_JOB_NAMES;
export type TQueueKey = keyof TQueue;
type TQueueJobName = { [K in TQueueKey]: { queueName: K; jobName: TQueue[K][number] } }[TQueueKey];

export type IQueueJob<TData = unknown> = TQueueJobName & {
  data: TData;
  options?: JobsOptions;
};
