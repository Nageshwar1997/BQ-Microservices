import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { categoryRouter } from './category.route';

export const router = Router();

const { category } = METHODS_AND_PATHS;

router.use(category.base, categoryRouter);
