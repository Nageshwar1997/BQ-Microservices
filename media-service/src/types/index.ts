import type { InferSchemaType, Types } from 'mongoose';
import type { mediaSchema } from '../models';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

type TMedia = InferSchemaType<typeof mediaSchema>;

export interface IMedia extends TMedia, IId {}

type TResource = Pick<TMedia, 'resourceType'>;

export interface IUploaderBase extends TResource {
  folder: string;
}

export interface IUploader extends TResource, IUploaderBase {
  buffer: Buffer<ArrayBufferLike>;
}

export interface ISingleUploader extends TResource, IUploaderBase {
  file: Express.Multer.File;
}

export interface IMultipleUploader extends TResource, IUploaderBase {
  files: Express.Multer.File[];
}

export interface IRemover extends TResource {
  publicId: string;
}

export interface ISingleRemover extends TResource {
  publicId: string;
}

export interface IMultipleRemover extends TResource {
  publicIds: string[];
  retryCount?: number;
}
