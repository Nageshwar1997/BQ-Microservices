import { Router } from 'express';
import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { singleRouter } from './single.route';
import { multipleRouter } from './multiple.route';

export const router = Router();

const { multiple, single } = GATEWAY_METHODS_AND_PATHS;

router.use(single.base, singleRouter);
router.use(multiple.base, multipleRouter);
