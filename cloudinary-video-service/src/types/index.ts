import type { QUEUE_AND_JOB_NAMES } from '@/constants';
import type { JobsOptions } from 'bullmq';
import type { Types } from 'mongoose';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

type TQueue = typeof QUEUE_AND_JOB_NAMES;
export type TQueueKey = keyof TQueue;
type TQueueJobName = { [K in TQueueKey]: { queueName: K; jobName: TQueue[K][number] } }[TQueueKey];

export type IQueueJob<TData = unknown> = TQueueJobName & {
  data: TData;
  options?: JobsOptions;
};

export type TFileEntityKey = 'avatar' | 'others';
export type TResourceType = 'image' | 'video';
