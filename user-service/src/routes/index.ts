import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import { adminRouter } from './admin/index.js';
import { authRouter } from './auth/index.js';
import { userRouter } from './user/index.js';

export const router = Router();

const { admin, auth, user } = METHODS_AND_PATHS;

router.use(admin.base, adminRouter);
router.use(auth.base, authRouter);
router.use(user.base, userRouter);
