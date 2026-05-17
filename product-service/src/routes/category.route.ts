import { checkEmptyRequest, tryCatchSessionResponse } from '@beautinique/be-middlewares';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { addCategoryController } from '../controllers';
import { getCategoriesByParentLevel } from '../controllers/category/getCategory';
import { authorize } from '../middlewares';

export const categoryRouter = Router();

const { add, get } = METHODS_AND_PATHS.category;

categoryRouter[add.method](
  add.path,
  authorize(['ADMIN', 'MASTER']),
  checkEmptyRequest({ body: true }),
  tryCatchSessionResponse(addCategoryController),
);

categoryRouter[get.byParentLevel.method](
  get.byParentLevel.path,
  authorize(['ADMIN', 'MASTER', 'SELLER']),
  tryCatchSessionResponse(getCategoriesByParentLevel),
);
