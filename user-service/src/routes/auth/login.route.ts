import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { type Request, type Response, Router } from 'express';

export const loginRouter = Router();

const { login } = GATEWAY_METHODS_AND_PATHS.auth;

// Manual
loginRouter[login.manual.method](login.manual.path, (req: Request, res: Response) => {
  res.success(200, 'Hello', { data: req.body });
});

// Google
loginRouter[login.oauth.google.redirect.method](
  login.oauth.google.redirect.path,
  (req: Request, res: Response) => {
    res.success(200, 'Hello', { data: req.body });
  },
);

loginRouter[login.oauth.google.callback.method](
  login.oauth.google.callback.path,
  (req: Request, res: Response) => {
    res.success(200, 'Hello', { data: req.body });
  },
);

// LinkedIn
loginRouter[login.oauth.linkedin.redirect.method](
  login.oauth.linkedin.redirect.path,
  (req: Request, res: Response) => {
    res.success(200, 'Hello', { data: req.body });
  },
);

loginRouter[login.oauth.linkedin.callback.method](
  login.oauth.linkedin.callback.path,
  (req: Request, res: Response) => {
    res.success(200, 'Hello', { data: req.body });
  },
);

// GitHub
loginRouter[login.oauth.github.redirect.method](
  login.oauth.github.redirect.path,
  (req: Request, res: Response) => {
    res.success(200, 'Hello', { data: req.body });
  },
);

loginRouter[login.oauth.github.callback.method](
  login.oauth.github.callback.path,
  (req: Request, res: Response) => {
    res.success(200, 'Hello', { data: req.body });
  },
);
