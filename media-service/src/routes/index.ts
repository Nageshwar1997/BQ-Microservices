import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { authenticate } from '../middlewares';
import { uploadRouter } from './upload.route';

export const router = Router();

const { upload } = METHODS_AND_PATHS;

// Upload
router.use(upload.base, authenticate, uploadRouter);
