import {
  checkEmptyRequest,
  tryCatchResponse,
  validateMulter,
  zodValidator,
} from '@beautinique/be-middlewares';
import { mediaUploadSchema } from '@beautinique/be-zod';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { multipleMediaUploadController, singleMediaUploadController } from '../controllers';
import { envs } from '../envs';

export const uploadRouter = Router();

const { multiple, single } = METHODS_AND_PATHS.upload;

uploadRouter[single.method](
  single.path,
  validateMulter({ type: 'single', fieldName: 'file', isDev: envs.is_dev }),
  checkEmptyRequest({ body: true, file: true }),
  zodValidator(mediaUploadSchema),
  tryCatchResponse(singleMediaUploadController),
);

uploadRouter[multiple.method](
  multiple.path,
  validateMulter({ type: 'array', fieldName: 'files', isDev: envs.is_dev }),
  checkEmptyRequest({ body: true, files: true }),
  zodValidator(mediaUploadSchema),
  tryCatchResponse(multipleMediaUploadController),
);
