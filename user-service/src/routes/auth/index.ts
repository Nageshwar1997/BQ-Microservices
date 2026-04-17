import { Router } from 'express';
import { registerRouter } from './register.route';
import { loginRouter } from './login.route';
import { passwordRouter } from './password.route';
import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { logoutRouter } from './logout.route';

export const authRouter = Router();

const { auth } = GATEWAY_METHODS_AND_PATHS;

authRouter.use(auth.register.base, registerRouter);
authRouter.use(auth.login.base, loginRouter);
authRouter.use(auth.logout.base, logoutRouter);
authRouter.use(auth.password.base, passwordRouter);
