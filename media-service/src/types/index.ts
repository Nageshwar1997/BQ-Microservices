import type { TMediaUpload } from '@beautinique/be-zod';
import type { InferSchemaType, Types } from 'mongoose';

import type { mediaSchema } from '../models/index.js';

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

export type TFile = Express.Multer.File;

export interface IUploader extends TMediaUpload {
  file: TFile;
}

export interface ISingleUploader extends TMediaUpload {
  file: TFile;
}

export interface IMultipleUploader extends TMediaUpload {
  files: TFile[];
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
