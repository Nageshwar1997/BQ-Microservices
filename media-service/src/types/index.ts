import type { TMediaResource, TMediaStatus, TRole, TService } from '@beautinique/be-constants';
import type { Request } from 'express';
import type { Types } from 'mongoose';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface AuthRequest extends Request {
  user?: (IId & { role: TRole }) | null;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

interface IResource {
  resourceType: TMediaResource;
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

export interface IBaseMedia extends IResource {
  publicId: string;
  url: string;
  userId: Types.ObjectId;
  relatedTo: { service: TService; entity: string };
  expiresAt: Date | null;
  deletedAt: Date | null;
  status: TMediaStatus;
  metadata: Record<string, unknown>;
}

export interface IMedia extends IBaseMedia, ITimestamp, IId {}

export type TMediaDoc = IMedia & Document;
