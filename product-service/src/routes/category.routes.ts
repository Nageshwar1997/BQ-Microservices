import { tryCatchSession } from '@beautinique/backend-mongoose';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import { categoryUpdateZodSchema, categoryZodSchema, validateZod } from '@beautinique/backend-zod';
import { USER_ROLE_MAP } from '@beautinique/shared-constants';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import {
  addCategoryController,
  deleteCategoryController,
  getCategoriesByHierarchyController,
  getCategoriesByParentLevelController,
  updateCategoryController,
} from '../controllers/index.js';
import { authorize } from '../middlewares/index.js';

export const categoryRouter = Router();

const { add, get, update, delete: remove } = METHODS_AND_PATHS.category;

categoryRouter[add.method](
  add.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ body: true }),
  validateZod({ body: categoryZodSchema }),
  tryCatchSession(addCategoryController),
);

categoryRouter[update.method](
  update.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ body: true, params: true }),
  validateZod({ body: categoryUpdateZodSchema }),
  tryCatchSession(updateCategoryController),
);

categoryRouter[remove.method](
  remove.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ params: true }),
  tryCatchSession(deleteCategoryController),
);

categoryRouter[get.byParentLevel.method](
  get.byParentLevel.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER, USER_ROLE_MAP.SELLER]),
  tryCatchResponse(getCategoriesByParentLevelController),
);

categoryRouter[get.byHierarchy.method](
  get.byHierarchy.path,
  tryCatchResponse(getCategoriesByHierarchyController),
);
