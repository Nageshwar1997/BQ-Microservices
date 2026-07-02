import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import { authenticate } from '../middlewares/index.js';
import { uploadRouter } from './upload.route.js';

export const router = Router();

const { upload } = METHODS_AND_PATHS;

// Upload
router.use(upload.base, authenticate, uploadRouter);
