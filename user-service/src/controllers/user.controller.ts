import { AuthenticationError } from '@beautinique/backend-classes';
import { HEADERS_MAP } from '@beautinique/shared-constants';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../configs/index.js';

export const getSessionUserController = async (req: Request, res: Response) => {
  const userId = req.get(HEADERS_MAP.userId);

  if (!userId) {
    throw new AuthenticationError('You are not logged in');
  }

  const user = await redisCacheManager.user.getUser(userId);

  res.success({ message: 'User details fetched successfully', data: user });
};
