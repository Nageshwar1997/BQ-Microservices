import { AuthenticationError, AuthorizationError } from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TUserRole } from '@beautinique/backend-types';
import { HEADERS_MAP, USER_ROLE_MAP } from '@beautinique/shared-constants';
import type { NextFunction, Request, Response } from 'express';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.get(HEADERS_MAP.userId);
  const userRole = (req.get(HEADERS_MAP.userRole) ?? USER_ROLE_MAP.USER) as TUserRole;

  if (!userId) {
    throw new AuthenticationError('You are not logged in');
  }

  req.user = { _id: getObjId(userId), role: userRole };

  next();
};

export const authorize =
  (allowedRoles: TUserRole[]) => (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.get(HEADERS_MAP.userId);

    if (!userId) {
      throw new AuthenticationError('You are not logged in');
    }

    const userRole = (req.get(HEADERS_MAP.userRole) ?? USER_ROLE_MAP.USER) as TUserRole;

    if (!allowedRoles.includes(userRole)) {
      throw new AuthorizationError('You are not authorized to perform this action');
    }

    req.user = { _id: getObjId(userId), role: userRole };

    next();
  };
