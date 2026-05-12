import { type Response, Router } from 'express';
import { redisCache } from '../../classes';
import { METHODS_AND_PATHS } from '../../constants';
import type { AuthRequest } from '../../types';

export const logoutRouter = Router();

const { logout } = METHODS_AND_PATHS.auth;

logoutRouter[logout.default.method](
  logout.default.path,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?._id;

    if (userId) await redisCache.deleteUser(userId);

    res.success(200, 'Logged out successfully');
  },
);
