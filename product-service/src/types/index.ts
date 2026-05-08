import type { TRole } from '@beautinique/be-constants';
import type { JobsOptions } from 'bullmq';
import type { Request } from 'express';
import type { Document, Types } from 'mongoose';
import type { CATEGORY_LEVELS, QUEUE_AND_JOB_NAMES } from '../constants';

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

export type TCategoryDoc = TCategory & Document & ITimestamp;

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
  user?: { _id: TId; role: TRole } | null;
}
