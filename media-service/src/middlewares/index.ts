import { AppError } from '@beautinique/be-classes';
import type { TRole } from '@beautinique/be-constants';
import type { NextFunction, Response } from 'express';
import { HEADERS_KEYS } from '../constants';
import type { AuthRequest } from '../types';

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const userId = req.get(HEADERS_KEYS.userId) || '';
  const userRole = (req.get(HEADERS_KEYS.userRole) || 'USER') as TRole;

  if (!userId) {
    throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
  }

  req.user = { _id: userId, role: userRole };

  next();
};

export const authorize =
  (allowedRoles: TRole[]) => (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userId = req.get(HEADERS_KEYS.userId) || '';

    if (!userId) {
      throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
    }

    const userRole = (req.get(HEADERS_KEYS.userRole) || 'USER') as TRole;

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new AppError({
        message: 'You are not authorized to perform this action',
        code: 'AUTHORIZATION_ERROR',
      });
    }

    req.user = { _id: userId, role: userRole };

    next();
  };
