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

export type TResourceType = 'image' | 'video';

interface IResource {
  resourceType: TResourceType;
}

export interface IUploaderBase extends IResource {
  folder: string;
}

export interface IUploader extends IResource, IUploaderBase {
  buffer: Buffer<ArrayBufferLike>;
}

export interface ISingleUploader extends IResource, IUploaderBase {
  file: Express.Multer.File;
}

export interface IMultipleUploader extends IResource, IUploaderBase {
  files: Express.Multer.File[];
}

export interface IRemover extends IResource {
  publicId: string;
}

export interface ISingleRemover extends IResource {
  publicId: string;
}

export interface IMultipleRemover extends IResource {
  publicIds: string[];
  retryCount?: number;
}
