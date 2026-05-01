import { Router } from 'express';
import { METHODS_AND_PATHS } from '../../constants';
import { loginRouter } from './login.route';
import { logoutRouter } from './logout.route';
import { passwordRouter } from './password.route';
import { registerRouter } from './register.route';

export const authRouter = Router();

const { auth } = METHODS_AND_PATHS;

authRouter.use(auth.register.base, registerRouter);
authRouter.use(auth.login.base, loginRouter);
authRouter.use(auth.logout.base, logoutRouter);
authRouter.use(auth.password.base, passwordRouter);
