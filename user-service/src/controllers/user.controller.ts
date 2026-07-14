import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';

import { redisCache } from '../classes/index.js';
import { HEADERS_KEYS } from '../constants/index.js';

export const getSessionUserController = async (req: Request, res: Response) => {
  const userId = req.get(HEADERS_KEYS.userId);

  if (!userId) {
    throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
  }

  const user = await redisCache.getUser(userId);

  res.success(200, 'User details fetched successfully', { user });
};
