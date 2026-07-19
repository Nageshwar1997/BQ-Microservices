import { NotFoundError } from '@beautinique/backend-classes';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';

import { redisCacheManager } from '../configs/index.js';

export const createPendingProductPayload = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const user = getUser(req.user);
  const draft = await redisCacheManager.dashboard.getDraftProduct(user._id.toString());

  if (!draft) {
    throw new NotFoundError('Draft expired');
  }

  req.body = draft;

  next();
};
