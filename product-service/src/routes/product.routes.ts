import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { tryCatchSession } from '@beautinique/backend-mongoose';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import {
  draftProductDetailsZodSchema,
  draftProductStepBodyZodSchema,
  validateZod,
} from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import {
  getDashboardProductBySlugController,
  getDashboardProductsController,
  getDraftProductController,
  getProductBySlugController,
  getProductsSuggestionsController,
  publishDraftProductController,
  saveDraftProductController,
} from '../controllers/index.js';
import { authorize, createPendingProductPayload } from '../middlewares/index.js';

export const productRouter = Router();
const draftRouter = Router();
const dashboardRouter = Router();
const { draft, get } = METHODS_AND_PATHS.product;

/* ================== DRAFT ROUTES ================ */

draftRouter[draft.save.method](
  draft.save.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: draftProductStepBodyZodSchema }),
  tryCatchResponse(saveDraftProductController),
);

draftRouter[draft.publish.method](
  draft.publish.path,
  createPendingProductPayload,
  checkEmptyRequest({ body: true }),
  validateZod({ body: draftProductDetailsZodSchema }),
  tryCatchSession(publishDraftProductController),
);

draftRouter[draft.get.method](draft.get.path, tryCatchResponse(getDraftProductController));

/* ================== DASHBOARD ROUTES ================ */

dashboardRouter[get.dashboard.products.method](
  get.dashboard.products.path,
  tryCatchResponse(getDashboardProductsController),
);

dashboardRouter[get.dashboard.bySlug.method](
  get.dashboard.bySlug.path,
  tryCatchResponse(getDashboardProductBySlugController),
);

/* ================== PRODUCTS ROUTES ================ */

productRouter.use(
  draft.base,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER, USER_ROLE_MAP.SELLER]),
  draftRouter,
);
productRouter.use(
  get.dashboard.base,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER, USER_ROLE_MAP.SELLER]),
  dashboardRouter,
);

productRouter[get.bySlug.method](get.bySlug.path, getProductBySlugController);

productRouter[get.suggestions.method](
  get.suggestions.path,
  tryCatchResponse(getProductsSuggestionsController),
);
