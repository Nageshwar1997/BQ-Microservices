import { MB } from '@beautinique/backend-constants';
import { validateMulter } from '@beautinique/backend-multer';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import { folderZodSchema, validateZod } from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import {
  multipleMediaUploadController,
  singleMediaUploadController,
} from '../controllers/index.js';
export const uploadRouter = Router();

const { multiple, single } = METHODS_AND_PATHS.upload;

// `limits.fileSize` aborts the upload stream early once the largest
// allowed size (10MB) is exceeded, instead of buffering the whole file
// into memory first just to reject it via the per-type size check below.
const UPLOAD_LIMITS = { fileSize: MB * 10 };

uploadRouter[single.method](
  single.path,
  validateMulter({ type: 'single', fieldName: 'file', limits: UPLOAD_LIMITS }),
  checkEmptyRequest({ body: true, file: true }),
  validateZod({ body: folderZodSchema }),
  tryCatchResponse(singleMediaUploadController),
);

uploadRouter[multiple.method](
  multiple.path,
  validateMulter({ type: 'array', fieldName: 'files', limits: UPLOAD_LIMITS }),
  checkEmptyRequest({ body: true, files: true }),
  validateZod({ body: folderZodSchema }),
  tryCatchResponse(multipleMediaUploadController),
);
