import { AppError } from '@beautinique/be-classes';
import type { TRole } from '@beautinique/be-constants';
import type { NextFunction, Response } from 'express';
import { getUserById } from '../services';
import type { AuthRequest } from '../types';

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const userId = req.get('X-User-Id') || '';

    if (!userId) {
      throw new AppError({
        message: 'You are not logged in',
        statusCode: 401,
        code: 'AUTH_ERROR',
      });
    }

    const user = await getUserById({ id: userId, password: true });

    if (!user) {
      throw new AppError({
        message: 'User not found',
        statusCode: 404,
        code: 'AUTH_ERROR',
      });
    }

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
        throw new AppError({
          message: 'You are not logged in',
          statusCode: 401,
          code: 'AUTH_ERROR',
        });
      }

      const user = await getUserById({ id: userId, password: true });

      if (!user) {
        throw new AppError({
          message: 'User not found',
          statusCode: 404,
          code: 'AUTH_ERROR',
        });
      }

      if (!allowedRoles.includes(user.role) || user.role !== userRole) {
        throw new AppError({
          message: 'You are not authorized to perform this action',
          statusCode: 403,
          code: 'AUTH_ERROR',
        });
      }

      req.user = user;

      next();
    } catch (error) {
      next(error);
    }
  };
