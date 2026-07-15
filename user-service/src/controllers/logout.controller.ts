import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCache } from '../classes/index.js';

export const logoutController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  if (userId) await redisCache.user.deleteUser(userId);

  res.success({ message: 'Logged out successfully' });
};
