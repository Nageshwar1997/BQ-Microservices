import {
  checkEmptyRequest,
  tryCatchResponse,
  tryCatchSessionResponse,
} from '@beautinique/be-middlewares';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { publishDraftProductController, saveDraftProductController } from '../controllers';
import { authorize, createPendingProductPayload } from '../middlewares';

export const productRouter = Router();
const draftRouter = Router();
const { draft } = METHODS_AND_PATHS.product;

draftRouter[draft.save.method](
  draft.save.path,
  checkEmptyRequest({ body: true }),
  tryCatchResponse(saveDraftProductController),
);

draftRouter[draft.publish.method](
  draft.publish.path,
  createPendingProductPayload,
  checkEmptyRequest({ body: true }),
  tryCatchSessionResponse(publishDraftProductController),
);

productRouter.use(draft.base, authorize(['ADMIN', 'SELLER', 'MASTER']), draftRouter);
