import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';

export const logoutController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  if (userId) await redisCacheManager.user.deleteUser(userId);

  res.success({ message: 'Logged out successfully' });
};
