import {
  checkEmptyRequest,
  tryCatchResponse,
  tryCatchSessionResponse,
  zodValidator,
} from '@beautinique/be-middlewares';
import { categoryUpdateZodSchema, categoryZodSchema } from '@beautinique/be-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import {
  addCategoryController,
  deleteCategoryController,
  getCategoriesByHierarchy,
  getCategoriesByParentLevel,
  updateCategoryController,
} from '../controllers/index.js';
import { authorize } from '../middlewares/index.js';

export const categoryRouter = Router();

const { add, get, update, delete: remove } = METHODS_AND_PATHS.category;

categoryRouter[add.method](
  add.path,
  authorize(['ADMIN', 'MASTER']),
  checkEmptyRequest({ body: true }),
  zodValidator(categoryZodSchema),
  tryCatchSessionResponse(addCategoryController),
);

categoryRouter[update.method](
  update.path,
  authorize(['ADMIN', 'MASTER']),
  checkEmptyRequest({ body: true, params: true }),
  zodValidator(categoryUpdateZodSchema),
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
  tryCatchResponse(getCategoriesByParentLevel),
);

categoryRouter[get.byHierarchy.method](
  get.byHierarchy.path,
  tryCatchResponse(getCategoriesByHierarchy),
);
