import type { TRole } from '@beautinique/be-constants';
import type { JobsOptions } from 'bullmq';
import type { Request } from 'express';
import type { Types } from 'mongoose';
import type { QUEUE_AND_JOB_NAMES, RESOURCES, SERVICES, STATUSES } from '../constants';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface AuthRequest extends Request {
  user?: { _id: string; role: TRole } | null;
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

export type TResourceType = (typeof RESOURCES)[number];

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

export type TService = (typeof SERVICES)[number];

export type TStatus = (typeof STATUSES)[number];

export interface IBaseMedia {
  publicId: string;
  url: string;
  resourceType: TResourceType;
  uploadedBy: Types.ObjectId;
  deletedBy: Types.ObjectId;
  relatedTo: { service: TService; entity: string; entityId: string };
  expiresAt: Date | null;
  status: TStatus;
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  isUsed: boolean;
}

export interface IMedia extends IBaseMedia, ITimestamp, IId {}

export type TMediaDoc = IMedia & Document;
