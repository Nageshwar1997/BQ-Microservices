import { tryCatchResponse } from '@beautinique/backend-response';
import { updateUserZodSchema, validateZod } from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import { getSessionUserController, updateUserController } from '../../controllers/index.js';
import { authenticate } from '../../middlewares/index.js';

export const userRouter = Router();

const { session, update } = METHODS_AND_PATHS.user;

userRouter[session.method](session.path, authenticate, tryCatchResponse(getSessionUserController));

userRouter[update.method](
  update.path,
  authenticate,
  validateZod({ body: updateUserZodSchema }),
  tryCatchResponse(updateUserController),
);
