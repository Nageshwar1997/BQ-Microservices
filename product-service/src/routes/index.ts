import { Router } from 'express';
import { METHODS_AND_PATHS } from '../constants';
import { authRouter } from './auth';
import { userRouter } from './user';

export const router = Router();

const { auth, user } = METHODS_AND_PATHS;

router.use(auth.base, authRouter);
router.use(user.base, userRouter);
