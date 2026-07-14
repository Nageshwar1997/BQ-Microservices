import { AuthenticationError, AuthorizationError } from '@beautinique/backend-classes';
import type { TRole } from '@beautinique/be-constants';
import type { NextFunction, Request, Response } from 'express';

import { redisCache } from '../classes/index.js';
import { HEADERS_KEYS } from '../constants/index.js';

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const userId = req.get(HEADERS_KEYS.userId);

    if (!userId) {
      throw new AuthenticationError('You are not logged in');
    }

    const user = await redisCache.getUser(userId);

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize =
  (allowedRoles: TRole[]) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.get(HEADERS_KEYS.userId);
      const userRole = (req.get(HEADERS_KEYS.userRole) ?? 'USER') as TRole;

      if (!userId) {
        throw new AuthenticationError('You are not logged in');
      }

      const user = await redisCache.getUser(userId);

      if (!allowedRoles.includes(user.role) || user.role !== userRole) {
        throw new AuthorizationError('You are not authorized to perform this action');
      }

      req.user = user;

      next();
    } catch (error) {
      next(error);
    }
  };
