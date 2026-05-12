import {
  MulterMiddleware,
  RequestMiddleware,
  ResponseMiddleware,
  ZodMiddleware,
} from '@beautinique/be-middlewares';
import { mediaUploadSchema } from '@beautinique/be-zod';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { multipleMediaUploadController, singleMediaUploadController } from '../controllers';
import { envs } from '../envs';

export const router = Router();

const { base, multiple, single } = METHODS_AND_PATHS.upload;

// Upload
router[single.method](
  `${base}${single.path}`,
  MulterMiddleware.validate({ type: 'single', fieldName: 'file', isDev: envs.is_dev }),
  RequestMiddleware.emptyRequest({ body: true, file: true }),
  ZodMiddleware.validateSchema(mediaUploadSchema),
  ResponseMiddleware.tryCatch(singleMediaUploadController),
);

router[multiple.method](
  `${base}${multiple.path}`,
  MulterMiddleware.validate({ type: 'array', fieldName: 'files', isDev: envs.is_dev }),
  RequestMiddleware.emptyRequest({ body: true, files: true }),
  ZodMiddleware.validateSchema(mediaUploadSchema),
  ResponseMiddleware.tryCatch(multipleMediaUploadController),
);
