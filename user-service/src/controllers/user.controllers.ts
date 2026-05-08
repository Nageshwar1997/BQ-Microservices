import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { redisCache } from '../classes';

export const getSessionUserController = async (req: Request, res: Response) => {
  const userId = req.get('X-User-Id') || '';
  const user = await redisCache.getUser(userId);

  if (!user) throw new AppError({ message: 'User not found', code: 'NOT_FOUND' });

  res.success(200, 'User details fetched successfully', { user });
};
