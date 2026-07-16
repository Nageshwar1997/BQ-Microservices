import { tryCatchResponse } from '@beautinique/backend-response';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import { getSessionUserController } from '../../controllers/index.js';

export const userRouter = Router();

const { session } = METHODS_AND_PATHS.user;

userRouter[session.method](session.path, tryCatchResponse(getSessionUserController));
