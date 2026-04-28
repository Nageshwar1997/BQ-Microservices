import { METHODS_AND_PATHS } from '@/constants';
import { getUserDetailsController } from '@/controllers';
import { RequestMiddleware, ResponseMiddleware } from '@beautinique/be-middlewares';
import { Router } from 'express';

export const userRouter = Router();

const { me } = METHODS_AND_PATHS.user;

userRouter[me.method](
  me.path,
  RequestMiddleware.emptyRequest({ query: true }),
  ResponseMiddleware.tryCatch(getUserDetailsController),
);
