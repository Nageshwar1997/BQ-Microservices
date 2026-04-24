import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { createMultipleMediaController, createSingleMediaController } from '@/controllers';
import { RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import { Router } from 'express';

export const mediaRouter = Router();

const { create } = GATEWAY_METHODS_AND_PATHS.media;

mediaRouter[create.single.method](
  `${create.base}${create.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(createSingleMediaController),
);

mediaRouter[create.multiple.method](
  `${create.base}${create.multiple.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(createMultipleMediaController),
);
