import {
  checkEmptyRequest,
  tryCatchResponse,
  tryCatchSessionResponse,
} from '@beautinique/be-middlewares';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import {
  getDashboardProductsController,
  getDashboardProductsSuggestionsController,
  getDraftProductController,
  getProductsSuggestionsController,
  publishDraftProductController,
  saveDraftProductController,
} from '../controllers';
import { authorize, createPendingProductPayload } from '../middlewares';

export const productRouter = Router();
const draftRouter = Router();
const dashboardRouter = Router();
const { draft, get } = METHODS_AND_PATHS.product;

/* ================== DRAFT ROUTES ================ */

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

/* ================== DASHBOARD ROUTES ================ */

dashboardRouter[get.dashboard.products.method](
  get.dashboard.products.path,
  tryCatchResponse(getDashboardProductsController),
);

dashboardRouter[get.dashboard.suggestions.method](
  get.dashboard.suggestions.path,
  tryCatchResponse(getDashboardProductsSuggestionsController),
);

/* ================== PRODUCTS ROUTES ================ */

productRouter.use(draft.base, authorize(['ADMIN', 'SELLER', 'MASTER']), draftRouter);
productRouter.use(get.dashboard.base, authorize(['ADMIN', 'SELLER', 'MASTER']), dashboardRouter);

productRouter[get.suggestions.method](
  get.suggestions.path,
  tryCatchResponse(getProductsSuggestionsController),
);
