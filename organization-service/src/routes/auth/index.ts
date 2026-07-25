import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import { logoutController } from '../../controllers/index.js';
import { authenticate } from '../../middlewares/index.js';
import { loginRouter } from './login.route.js';
import { passwordRouter } from './password.route.js';
import { registerRouter } from './register.route.js';

export const authRouter = Router();

const { login, logout, password, register } = METHODS_AND_PATHS.auth;

authRouter[logout.method](logout.path, authenticate, logoutController);
authRouter.use(register.base, registerRouter);
authRouter.use(login.base, loginRouter);
authRouter.use(password.base, passwordRouter);
