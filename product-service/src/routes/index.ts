import { type Request, type Response, Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { categoryRouter } from './category.route';

export const router = Router();

const { health, home, category } = METHODS_AND_PATHS;

// Home Route
router[home.method](home.path, (_: Request, res: Response) =>
  res.success(200, 'Welcome to the Product Service API'),
);

// Health Route
router[health.method](health.path, (_: Request, res: Response) =>
  res.success(200, 'Product Service is healthy'),
);

router.use(category.base, categoryRouter);
