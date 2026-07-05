import type { TFolderZodSchema } from '@beautinique/backend-types';
import type { InferSchemaType, Types } from 'mongoose';
import type { Multer, Options } from 'multer';

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

type TMediaKey = 'IMAGE' | 'VIDEO' | 'OTHER';

interface ICommonMulterFileConfigs {
  format?: Partial<Record<TMediaKey, string[]>>;
  size?: Partial<Record<TMediaKey, number>>;
}

export interface IMulterValidation extends ICommonMulterFileConfigs {
  type: keyof Multer;
  fieldName?: string;
  maxCount?: number;
  fieldsConfig?: { name: string; maxCount: number }[];
  limits?: Options['limits'];
}

export interface ICollectCustomError extends ICommonMulterFileConfigs {
  files: Express.Multer.File[];
}
export interface ICollectMulterError extends Pick<IMulterValidation, 'fieldName' | 'maxCount'> {
  error?: unknown;
}
