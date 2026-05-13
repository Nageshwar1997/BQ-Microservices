import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { authorize } from '../middlewares';
import { categoryRouter } from './category.route';

export const router = Router();

const { category } = METHODS_AND_PATHS;

router.use(category.base, authorize(['ADMIN', 'MASTER', 'SELLER']), categoryRouter);
