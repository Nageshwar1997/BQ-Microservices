import type { QUEUE_AND_JOB_NAMES } from '@/constants';
import type { TCloudinaryOption } from '@beautinique/be-constants';
import type { JobsOptions } from 'bullmq';
import type { v2 } from 'cloudinary';
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

export type TV2 = typeof v2;

export interface ICloudinaryUploader extends IPublicIdOptions {
  cloudinary: TV2;
  folder: string;
  resourceType: TResourceType;
  buffer: Buffer<ArrayBufferLike>;
}

export interface ICloudinaryRemover {
  publicId: string;
  cloudinary: TV2;
}

type TCloudinaryBaseUploader = IPublicIdOptions &
  Pick<ICloudinaryUploader, 'folder' | 'resourceType'>;

export interface ICloudinarySingleUploader extends TCloudinaryBaseUploader {
  file: Express.Multer.File;
}

export interface ICloudinaryMultiUploader extends TCloudinaryBaseUploader {
  files: Express.Multer.File[];
}

export interface ICloudinarySingleRemover extends Pick<IPublicIdOptions, 'accountKey'> {
  publicId: string;
}

export interface ICloudinaryMultiRemover extends Pick<IPublicIdOptions, 'accountKey'> {
  publicIds: string[];
  retryCount?: number;
}
