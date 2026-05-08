import { AppError } from '@beautinique/be-classes';
import type { TRole } from '@beautinique/be-constants';
import type { NextFunction, Response } from 'express';
import { redisCache } from '../classes';
import type { AuthRequest } from '../types';

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const userId = req.get('X-User-Id') || '';

    if (!userId) {
      throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
    }

    const user = await redisCache.getUser(userId, true);

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize =
  (allowedRoles: TRole[]) => async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const userId = req.get('X-User-Id') || '';
      const userRole = (req.get('X-User-Role') || 'USER') as TRole;

      if (!userId) {
        throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
      }

      const user = await redisCache.getUser(userId, true);

      if (!allowedRoles.includes(user.role) || user.role !== userRole) {
        throw new AppError({
          message: 'You are not authorized to perform this action',
          code: 'AUTHORIZATION_ERROR',
        });
      }

      req.user = user;

      next();
    } catch (error) {
      next(error);
    }
  };
