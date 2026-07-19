import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';

export const getDraftProductController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const draft = await redisCacheManager.dashboard.getDraftProduct(userId.toString());

  res.success({ message: 'Draft product fetched successfully', data: draft });
};
