import type { Response } from 'express';
import { redisCache } from '../classes';
import type { AuthRequest } from '../types';

export const logoutController = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;

  if (userId) await redisCache.deleteUser(userId);

  res.success(200, 'Logged out successfully');
};
