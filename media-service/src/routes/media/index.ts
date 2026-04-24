import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import {
  createMultipleMediaController,
  createSingleMediaController,
  markAsDeletedMultipleMediaController,
  markAsDeletedSingleMediaController,
  markAsUsedMultipleMediaController,
  markAsUsedSingleMediaController,
} from '@/controllers';
import { RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import { Router } from 'express';

export const mediaRouter = Router();

const { deleted, unused, used } = GATEWAY_METHODS_AND_PATHS.media;

mediaRouter[unused.single.method](
  `${unused.base}${unused.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(createSingleMediaController),
);

mediaRouter[unused.multiple.method](
  `${unused.base}${unused.multiple.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(createMultipleMediaController),
);

mediaRouter[used.single.method](
  `${used.base}${used.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsUsedSingleMediaController),
);

mediaRouter[used.single.method](
  `${used.base}${used.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsUsedMultipleMediaController),
);

mediaRouter[deleted.single.method](
  `${deleted.base}${deleted.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsDeletedSingleMediaController),
);

mediaRouter[deleted.single.method](
  `${deleted.base}${deleted.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsDeletedMultipleMediaController),
);
