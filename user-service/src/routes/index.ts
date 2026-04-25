import { Router } from 'express';
import { userRouter } from './user';
import { authRouter } from './auth';
import { METHODS_AND_PATHS } from '@/constants';

export const router = Router();

const { auth, user } = METHODS_AND_PATHS;

router.use(auth.base, authRouter);
router.use(user.base, userRouter);
