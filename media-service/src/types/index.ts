import type { TMediaUpload } from '@beautinique/be-zod';
import type { InferSchemaType, Types } from 'mongoose';
import type { Options } from 'multer';

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

type TMediaKey = 'IMAGE' | 'VIDEO' | 'OTHER';

interface ICommonMulterFileConfigs {
  format?: Partial<Record<TMediaKey, string[]>>;
  size?: Partial<Record<TMediaKey, number>>;
}

export interface IMulterValidation extends ICommonMulterFileConfigs {
  type: 'single' | 'array' | 'any' | 'fields' | 'none';
  fieldName?: string;
  maxCount?: number;
  fieldsConfig?: { name: string; maxCount: number }[];
  limits?: Options['limits'];
  isDev?: boolean;
}

export interface IMulterCustomError extends ICommonMulterFileConfigs {
  files: Express.Multer.File[];
}
export interface IMulterDefaultError extends Pick<IMulterValidation, 'fieldName' | 'maxCount'> {
  isDev: boolean;
  error?: unknown;
}
