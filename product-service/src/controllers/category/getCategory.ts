import type { Request, Response } from 'express';
import { redisCache } from '../../classes';

export const getAllCategories = async (_req: Request, res: Response) => {
  const categories = await redisCache.getAllCategories();

  res.success(200, 'Categories fetched successfully', { categories });
};
