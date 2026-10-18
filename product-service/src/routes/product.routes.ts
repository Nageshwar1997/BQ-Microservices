import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { tryCatchSession } from '@beautinique/backend-mongoose';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import {
  draftProductDetailsZodSchema,
  draftProductStepBodyZodSchema,
  updateProductApprovalStatusZodSchema,
  validateZod,
} from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import {
  getDashboardProductBySlugController,
  getDashboardProductsController,
  getDraftProductController,
  getProductBySlugController,
  getProductQueueController,
  getProductsController,
  getProductsSuggestionsController,
  publishDraftProductController,
  saveDraftProductController,
  updateProductApprovalStatusController,
} from '../controllers/index.js';
import {
  authorize,
  authorizeProductOwnership,
  createPendingProductPayload,
} from '../middlewares/index.js';

export const productRouter = Router();
const draftRouter = Router();
const dashboardRouter = Router();
const { draft, get, queue, updateApprovalStatus } = METHODS_AND_PATHS.product;

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

// Only a SELLER creates/edits their own draft products - ADMIN/MASTER used
// to also be allowed here (with an auto-publish shortcut in
// `publishDraftProductController`, now removed), which meant an admin's own
// "draft" bypassed review entirely. Every product goes through the
// review queue the same way now, no exceptions (see `updateApprovalStatus`
// route below).
productRouter.use(draft.base, authorize([USER_ROLE_MAP.SELLER]), draftRouter);

/* ================== ADMIN REVIEW ================== */

productRouter[updateApprovalStatus.method](
  updateApprovalStatus.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.SUPER_ADMIN, USER_ROLE_MAP.MASTER]),
  authorizeProductOwnership,
  checkEmptyRequest({ body: true, params: true }),
  validateZod({ body: updateProductApprovalStatusZodSchema }),
  tryCatchResponse(updateProductApprovalStatusController),
);

// Registered before `get.bySlug` (`/:slug`) below - both are GET, and an
// Express wildcard param route matches on registration order, so `/queue`
// would otherwise be swallowed as a slug value.
productRouter[queue.method](
  queue.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.SUPER_ADMIN, USER_ROLE_MAP.MASTER]),
  tryCatchResponse(getProductQueueController),
);

/* ================== PUBLIC STOREFRONT ================== */

// The public routes are registered before `get.bySlug` (`/:slug`): both are GET, and an Express
// wildcard param route matches on registration order, so `/products` and `/suggestions` would otherwise
// be swallowed as a slug value (`/suggestions` was - it answered `null` as the product).
productRouter[get.products.method](get.products.path, tryCatchResponse(getProductsController));

productRouter[get.suggestions.method](
  get.suggestions.path,
  tryCatchResponse(getProductsSuggestionsController),
);

productRouter.use(
  get.dashboard.base,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER, USER_ROLE_MAP.SELLER]),
  dashboardRouter,
);

productRouter[get.bySlug.method](get.bySlug.path, tryCatchResponse(getProductBySlugController));
