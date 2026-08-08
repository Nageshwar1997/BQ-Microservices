import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import { validateZod } from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import {
  createSellerController,
  getDraftSellerController,
  saveDraftSellerController,
} from '../../controllers/index.js';
import { authenticate, authorize } from '../../middlewares/index.js';
import { createSellerZodSchema, sellerDraftStepBodyZodSchema } from '../../schemas/index.js';

export const sellerRouter = Router();
const draftRouter = Router();

const { create, draft } = METHODS_AND_PATHS.seller;

/* ================== DRAFT ROUTES (self-service onboarding wizard) ================== */

draftRouter[draft.save.method](
  draft.save.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: sellerDraftStepBodyZodSchema }),
  tryCatchResponse(saveDraftSellerController),
);

draftRouter[draft.get.method](draft.get.path, tryCatchResponse(getDraftSellerController));

sellerRouter.use(draft.base, authenticate, draftRouter);

/* ================== CREATE ROUTE (admin/master) ================== */

sellerRouter[create.method](
  create.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ body: true }),
  validateZod({ body: createSellerZodSchema }),
  tryCatchResponse(createSellerController),
);
