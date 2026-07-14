import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCache } from '../classes/index.js';

export const logoutController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  if (userId) await redisCache.deleteUser(userId);

  res.success(200, 'Logged out successfully');
};
