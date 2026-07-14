import { AuthenticationError, AuthorizationError } from '@beautinique/backend-classes';
import { HEADERS_MAP, USER_ROLE_MAP } from '@beautinique/shared-constants';
import type { TUserRole } from '@beautinique/shared-types';
import type { NextFunction, Request, Response } from 'express';

import { redisCache } from '../classes/index.js';

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const userId = req.get(HEADERS_MAP.userId);

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
  (allowedRoles: TUserRole[]) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.get(HEADERS_MAP.userId);
      const userRole = (req.get(HEADERS_MAP.userRole) ?? USER_ROLE_MAP.USER) as TUserRole;

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
