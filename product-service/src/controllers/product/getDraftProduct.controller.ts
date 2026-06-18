import type { Request, Response } from 'express';
import { redisCache } from '../../classes';
import { getUser } from '../../utils';

export const getDraftProductController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req);

  const draft = await redisCache.getDraftProduct(userId.toString());

  return res.success(200, 'Draft product fetched successfully', { draft });
};
