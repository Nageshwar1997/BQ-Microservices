import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { redisCache } from '../classes';

export const getSessionUserController = async (req: Request, res: Response) => {
  const userId = req.query?.userId as string;
  const user = await redisCache.getUser(userId);

  if (!user) {
    throw new AppError({ message: 'User not found', statusCode: 404 });
  }

  res.success(200, 'User details fetched successfully', { user });
};
