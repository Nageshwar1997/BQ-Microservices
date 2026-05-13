import { checkEmptyRequest, tryCatchResponse } from '@beautinique/be-middlewares';
import { Router } from 'express';
import { createCategoryController } from '../controllers';
import { authorize } from '../middlewares';

export const categoryRouter = Router();

categoryRouter.post(
  '/create',
  authorize(['ADMIN', 'MASTER', 'SELLER']),
  checkEmptyRequest({ body: true }),
  tryCatchResponse(createCategoryController),
);
