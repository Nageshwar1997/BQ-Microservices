import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCache } from '../../classes/index.js';

export const getDraftProductController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const draft = await redisCache.dashboard.getDraftProduct(userId.toString());

  res.success(200, 'Draft product fetched successfully', { draft });
};
