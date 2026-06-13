import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { categoryRouter } from './category.routes';
import { productRouter } from './product.routes';

export const router = Router();

const { category, product } = METHODS_AND_PATHS;

router.use(category.base, categoryRouter);
router.use(product.base, productRouter);
