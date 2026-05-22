import type { Request, Response } from 'express';
import { redisCache } from '../classes';

export const logoutController = async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (userId) await redisCache.deleteUser(userId);

  res.success(200, 'Logged out successfully');
};
