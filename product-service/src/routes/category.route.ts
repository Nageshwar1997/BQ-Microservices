import { checkEmptyRequest, tryCatchSessionResponse } from '@beautinique/be-middlewares';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { addCategoryController } from '../controllers';
import { getAllCategories } from '../controllers/category/getCategory';
import { authorize } from '../middlewares';

export const categoryRouter = Router();

const { add, get } = METHODS_AND_PATHS.category;

categoryRouter[add.method](
  add.path,
  authorize(['ADMIN', 'MASTER', 'SELLER']),
  checkEmptyRequest({ body: true }),
  tryCatchSessionResponse(addCategoryController),
);

categoryRouter[get.all.method](get.all.path, tryCatchSessionResponse(getAllCategories));
