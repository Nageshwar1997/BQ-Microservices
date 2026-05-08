import { AppError } from '@beautinique/be-classes';
import type { TRole } from '@beautinique/be-constants';
import type { NextFunction, Request, Response } from 'express';
import { envs } from '../envs';
import type { AuthRequest } from '../types';
import { toObjectId } from '../utils';

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const userId = req.get('X-User-Id') || '';
    const userRole = (req.get('X-User-Role') || 'USER') as TRole;

    if (!userId) {
      throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
    }

    req.user = { _id: toObjectId(userId), role: userRole };

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

      if (!allowedRoles.includes(userRole)) {
        throw new AppError({
          message: 'You are not authorized to perform this action',
          code: 'AUTHORIZATION_ERROR',
        });
      }

      req.user = { _id: toObjectId(userId), role: userRole };

      next();
    } catch (error) {
      next(error);
    }
  };

export const serviceAccess = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const secret = req.headers['x-service-secret'];

    if (secret !== envs.service_secret) {
      throw new AppError({
        message: 'You are not authorized to access this service',
        code: 'AUTHORIZATION_ERROR',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
