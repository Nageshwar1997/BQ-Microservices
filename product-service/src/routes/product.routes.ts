import {
  checkEmptyRequest,
  tryCatchResponse,
  tryCatchSessionResponse,
} from '@beautinique/be-middlewares';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { publishDraftProductController, saveDraftProductController } from '../controllers';
import { getDashboardProductsController } from '../controllers/product/getDashboardProducts.controller';
import { getDraftProductController } from '../controllers/product/getDraftProduct.controller';
import { getProductsSuggestionsController } from '../controllers/product/getProductsSuggestions.controller';
import { authorize, createPendingProductPayload } from '../middlewares';

export const productRouter = Router();
const draftRouter = Router();
const { draft, get } = METHODS_AND_PATHS.product;

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

draftRouter[draft.get.method](draft.get.path, tryCatchResponse(getDraftProductController));

productRouter.use(draft.base, authorize(['ADMIN', 'SELLER', 'MASTER']), draftRouter);

productRouter[get.dashboard.method](
  get.dashboard.path,
  authorize(['ADMIN', 'SELLER', 'MASTER']),
  checkEmptyRequest({ query: true }),
  tryCatchResponse(getDashboardProductsController),
);

productRouter[get.suggestions.method](
  get.suggestions.path,
  checkEmptyRequest({ query: true }),
  tryCatchResponse(getProductsSuggestionsController),
);
