import type { TFolderZodSchema } from '@beautinique/backend-types';
import type { InferSchemaType, Types } from 'mongoose';

import type { mediaSchema } from '../models/index.js';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export type IMedia = InferSchemaType<typeof mediaSchema> & IId;

export type TResource = Pick<IMedia, 'resourceType'>;

export type TFile = Express.Multer.File;

export interface IUploader extends TFolderZodSchema {
  file: TFile;
}

export interface ISingleUploader extends TFolderZodSchema {
  file: TFile;
}

export interface IMultipleUploader extends TFolderZodSchema {
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
