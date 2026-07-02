import type { TMediaUpload } from '@beautinique/be-zod';
import type { InferSchemaType, Types } from 'mongoose';

import type { MEDIA_RESOURCES } from '../constants/index.js';
import type { mediaSchema } from '../models/index.js';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export type TMediaResource = (typeof MEDIA_RESOURCES)[number];

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

type TMedia = InferSchemaType<typeof mediaSchema>;

export interface IMedia extends TMedia, IId {}

export interface IUploader extends TMediaUpload {
  file: Express.Multer.File;
}

export interface ISingleUploader extends TMediaUpload {
  file: Express.Multer.File;
}

export interface IMultipleUploader extends TMediaUpload {
  files: Express.Multer.File[];
}

export interface IRemover {
  publicId: string;
}

export interface ISingleRemover {
  publicId: string;
}

export interface IMultipleRemover {
  publicIds: string[];
  retryCount?: number;
}
