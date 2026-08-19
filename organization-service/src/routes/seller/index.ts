import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { tryCatchSession } from '@beautinique/backend-mongoose';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import {
  draftSellerDetailsZodSchema,
  draftSellerStepBodyZodSchema,
  updateSellerApprovalStatusZodSchema,
  validateZod,
} from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import {
  createSellerController,
  getDraftSellerController,
  getSellerQueueController,
  saveDraftSellerController,
  updateSellerApprovalStatusController,
} from '../../controllers/index.js';
import {
  authenticate,
  authorize,
  authorizeSellerOwnership,
  createPendingSellerPayload,
} from '../../middlewares/index.js';

export const sellerRouter = Router();
const draftRouter = Router();

const { draft, queue, updateApprovalStatus } = METHODS_AND_PATHS.seller;

/* ================== DRAFT ROUTES (self-service onboarding wizard) ================== */

draftRouter[draft.save.method](
  draft.save.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: draftSellerStepBodyZodSchema }),
  tryCatchResponse(saveDraftSellerController),
);

draftRouter[draft.get.method](draft.get.path, tryCatchResponse(getDraftSellerController));

draftRouter[draft.submit.method](
  draft.submit.path,
  createPendingSellerPayload,
  checkEmptyRequest({ body: true }),
  validateZod({ body: draftSellerDetailsZodSchema }),
  tryCatchSession(createSellerController),
);

sellerRouter.use(draft.base, authenticate, draftRouter);

/* ================== ADMIN REVIEW ================== */

sellerRouter[updateApprovalStatus.method](
  updateApprovalStatus.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.SUPER_ADMIN, USER_ROLE_MAP.MASTER]),
  authorizeSellerOwnership,
  checkEmptyRequest({ body: true, params: true }),
  validateZod({ body: updateSellerApprovalStatusZodSchema }),
  tryCatchResponse(updateSellerApprovalStatusController),
);

sellerRouter[queue.method](
  queue.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.SUPER_ADMIN, USER_ROLE_MAP.MASTER]),
  tryCatchResponse(getSellerQueueController),
);
