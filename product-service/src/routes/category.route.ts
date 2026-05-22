import { checkEmptyRequest, tryCatchSessionResponse } from '@beautinique/be-middlewares';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import {
  addCategoryController,
  deleteCategoryController,
  getCategoriesByParentLevel,
  updateCategoryController,
} from '../controllers';
import { authorize } from '../middlewares';

export const categoryRouter = Router();

const { add, get, update, delete: remove } = METHODS_AND_PATHS.category;

categoryRouter[add.method](
  add.path,
  authorize(['ADMIN', 'MASTER']),
  checkEmptyRequest({ body: true }),
  tryCatchSessionResponse(addCategoryController),
);

categoryRouter[update.method](
  update.path,
  authorize(['ADMIN', 'MASTER']),
  checkEmptyRequest({ body: true, params: true }),
  tryCatchSessionResponse(updateCategoryController),
);

categoryRouter[remove.method](
  remove.path,
  authorize(['ADMIN', 'MASTER']),
  checkEmptyRequest({ params: true }),
  tryCatchSessionResponse(deleteCategoryController),
);

categoryRouter[get.byParentLevel.method](
  get.byParentLevel.path,
  authorize(['ADMIN', 'MASTER', 'SELLER']),
  checkEmptyRequest({ query: true }),
  tryCatchSessionResponse(getCategoriesByParentLevel),
);
