import { RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../../constants';
import { getSessionUserController } from '../../controllers';

export const userRouter = Router();

const { session } = METHODS_AND_PATHS.user;

userRouter[session.method](
  session.path,
  RequestMiddleware.emptyRequest({ query: true }),
  ResponseMiddleware.tryCatch(getSessionUserController),
);
