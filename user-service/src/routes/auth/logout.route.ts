import { type Request, type Response, Router } from 'express';
import { METHODS_AND_PATHS } from '../../constants';

export const logoutRouter = Router();

const { logout } = METHODS_AND_PATHS.auth;

logoutRouter[logout.default.method](logout.default.path, (req: Request, res: Response) => {
  res.success(200, 'Hello', { data: req.body });
});
