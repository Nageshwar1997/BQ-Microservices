import { checkEmptyRequest, tryCatchSessionResponse } from '@beautinique/be-middlewares';
import { Router } from 'express';
import { createCategoryController } from '../controllers';
import { authorize } from '../middlewares';
import type { AuthRequest } from '../types';

export const categoryRouter = Router();

categoryRouter.post(
  '/create',
  authorize(['ADMIN', 'MASTER', 'SELLER']),
  checkEmptyRequest({ body: true }),
  tryCatchSessionResponse<AuthRequest>(createCategoryController),
);
