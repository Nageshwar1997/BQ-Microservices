import { type Request, type Response, Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { authenticate } from '../middlewares';
import { uploadRouter } from './upload.route';

export const router = Router();

const { health, home, upload } = METHODS_AND_PATHS;

// Home Route
router[home.method](home.path, (_: Request, res: Response) =>
  res.success(200, 'Welcome to the Media Service API'),
);

// Health Route
router[health.method](health.path, (_: Request, res: Response) =>
  res.success(200, 'Media Service is healthy'),
);

// Upload
router.use(upload.base, authenticate, uploadRouter);
