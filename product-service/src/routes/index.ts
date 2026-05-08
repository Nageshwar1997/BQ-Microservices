import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';

export const router = Router();

const { category } = METHODS_AND_PATHS;

router.use(category.base, () => {
  console.log('hello');
});
