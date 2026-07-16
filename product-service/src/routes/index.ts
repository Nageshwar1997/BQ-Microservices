import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import { categoryRouter } from './category.routes.js';
import { productRouter } from './product.routes.js';

export const router = Router();

const { category, product } = METHODS_AND_PATHS;

router.use(category.base, categoryRouter);
router.use(product.base, productRouter);
