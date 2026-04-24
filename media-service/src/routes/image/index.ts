import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { multipleImageUploadController, singleImageUploadController } from '@/controllers';
import {
  MulterMiddleware,
  RequestMiddleware,
  ResponseMiddleware,
} from '@beautinique/be-middlewares';
import { Router } from 'express';

export const imageRouter = Router();

const { single, multiple } = GATEWAY_METHODS_AND_PATHS.image;

imageRouter[single.upload.method](
  `${single.base}${single.upload.path}`,
  MulterMiddleware.validate({ type: 'single', fieldName: 'image' }),
  RequestMiddleware.emptyRequest({ file: true, body: true }),
  ResponseMiddleware.tryCatch(singleImageUploadController),
);

imageRouter[multiple.upload.method](
  `${multiple.base}${multiple.upload.path}`,
  MulterMiddleware.validate({ type: 'array', fieldName: 'images' }),
  RequestMiddleware.emptyRequest({ files: true, body: true }),
  ResponseMiddleware.tryCatch(multipleImageUploadController),
);
