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
import { authenticate } from '../middlewares';

export const router = Router();

const { base, multiple, single } = METHODS_AND_PATHS.upload;

// Upload
router[single.method](
  `${base}${single.path}`,
  authenticate,
  validateMulter({ type: 'single', fieldName: 'file', isDev: envs.is_dev }),
  checkEmptyRequest({ body: true, file: true }),
  zodValidator(mediaUploadSchema),
  tryCatchResponse(singleMediaUploadController),
);

router[multiple.method](
  `${base}${multiple.path}`,
  authenticate,
  validateMulter({ type: 'array', fieldName: 'files', isDev: envs.is_dev }),
  checkEmptyRequest({ body: true, files: true }),
  zodValidator(mediaUploadSchema),
  tryCatchResponse(multipleMediaUploadController),
);
