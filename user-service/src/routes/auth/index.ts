import { Router } from 'express';
import { METHODS_AND_PATHS } from '../../constants';
import { logoutController } from '../../controllers';
import { authenticate } from '../../middlewares';
import { loginRouter } from './login.route';
import { passwordRouter } from './password.route';
import { registerRouter } from './register.route';

export const authRouter = Router();

const { login, logout, password, register } = METHODS_AND_PATHS.auth;

authRouter[logout.method](logout.path, authenticate, logoutController);
authRouter.use(register.base, registerRouter);
authRouter.use(login.base, loginRouter);
authRouter.use(password.base, passwordRouter);
