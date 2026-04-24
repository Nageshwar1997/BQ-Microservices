import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { createSingleMediaController } from '@/controllers/createMedia.controller';
import { RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import { Router } from 'express';

export const mediaRouter = Router();

const { create } = GATEWAY_METHODS_AND_PATHS.media;

mediaRouter[create.single.method](
  `${create.base}${create.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(createSingleMediaController),
);
