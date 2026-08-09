import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';

export const getDraftSellerController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const draft = await redisCacheManager.seller.getDraftSeller(userId.toString());

  res.success({ message: 'Draft seller application fetched successfully', data: draft });
};
