import type { TUserRole } from '@beautinique/backend-types';
import { AppError } from '@beautinique/be-classes';
import { USER_ROLE_MAP } from '@beautinique/shared-constants';
import type { NextFunction, Request, Response } from 'express';

import { HEADERS_KEYS } from '../constants/index.js';
import { getObjId } from '../utils/index.js';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.get(HEADERS_KEYS.userId);
  const userRole = (req.get(HEADERS_KEYS.userRole) ?? USER_ROLE_MAP.USER) as TUserRole;

  if (!userId) {
    throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
  }

  req.user = { _id: getObjId(userId), role: userRole };

  next();
};

export const authorize =
  (allowedRoles: TUserRole[]) => (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.get(HEADERS_KEYS.userId);

    if (!userId) {
      throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
    }

    const userRole = (req.get(HEADERS_KEYS.userRole) ?? USER_ROLE_MAP.USER) as TUserRole;

    if (!allowedRoles.includes(userRole)) {
      throw new AppError({
        message: 'You are not authorized to perform this action',
        code: 'AUTHORIZATION_ERROR',
      });
    }

    req.user = { _id: getObjId(userId), role: userRole };

    next();
  };
