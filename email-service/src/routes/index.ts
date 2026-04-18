import { Router } from 'express';
import { userRouter } from './user';
import { authRouter } from './auth';
import { GATEWAY_METHODS_AND_PATHS } from '@/constants';

export const router = Router();

const { auth, user } = GATEWAY_METHODS_AND_PATHS;

router.use(auth.base, authRouter);
router.use(user.base, userRouter);
