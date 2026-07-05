import { folderZodSchema } from '@beautinique/backend-zod';
import { checkEmptyRequest, tryCatchResponse, zodValidator } from '@beautinique/be-middlewares';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import {
  multipleMediaUploadController,
  singleMediaUploadController,
} from '../controllers/index.js';
import { validateMulter } from '../middlewares/index.js';
export const uploadRouter = Router();

const { multiple, single } = METHODS_AND_PATHS.upload;

uploadRouter[single.method](
  single.path,
  validateMulter({ type: 'single', fieldName: 'file' }),
  checkEmptyRequest({ body: true, file: true }),
  zodValidator(folderZodSchema),
  tryCatchResponse(singleMediaUploadController),
);

uploadRouter[multiple.method](
  multiple.path,
  validateMulter({ type: 'array', fieldName: 'files' }),
  checkEmptyRequest({ body: true, files: true }),
  zodValidator(folderZodSchema),
  tryCatchResponse(multipleMediaUploadController),
);
