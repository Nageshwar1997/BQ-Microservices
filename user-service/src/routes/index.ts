import { type Request, type Response, Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { authRouter } from './auth';
import { userRouter } from './user';

export const router = Router();

const { auth, health, home, user } = METHODS_AND_PATHS;

// Home Route
router[home.method](home.path, (_: Request, res: Response) =>
  res.success(200, 'Welcome to the User Service API'),
);

// Health Route
router[health.method](health.path, (_: Request, res: Response) =>
  res.success(200, 'User Service is healthy'),
);

router.use(auth.base, authRouter);
router.use(user.base, userRouter);
