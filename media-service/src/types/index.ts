import type { QUEUE_AND_JOB_NAMES } from '@/constants';
import type { TCloudinaryOption } from '@beautinique/be-constants';
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

type TFileEntityKey = 'avatar' | 'others';
export type TResourceType = 'image' | 'video';
export interface IPublicIdOptions {
  accountKey: TCloudinaryOption;
  entityKey: TFileEntityKey;
}

interface ICloudinaryBaseUploader extends IPublicIdOptions {
  folder: string;
}

export interface ICloudinaryUploader extends ICloudinaryBaseUploader {
  file: Express.Multer.File;
  resourceType: TResourceType;
}

export interface ICloudinarySingleUploader extends ICloudinaryBaseUploader {
  file: Express.Multer.File;
}

export interface ICloudinaryMultiUploader extends ICloudinaryBaseUploader {
  files: Express.Multer.File[];
}

export interface ICloudinaryRemover {
  publicId: string;
  accountKey: TCloudinaryOption;
}
export type TCloudinarySingleRemover = ICloudinaryRemover;

export interface ICloudinaryMultiRemover extends Omit<ICloudinaryRemover, 'publicId'> {
  publicIds: string[];
  retryCount?: number;
}
