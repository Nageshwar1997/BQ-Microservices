import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { Router } from 'express';

export const loginRouter = Router();

const { login } = GATEWAY_METHODS_AND_PATHS.auth;

// Manual
loginRouter[login.manual.method](login.manual.path, async () => {});

// Google
loginRouter[login.oauth.google.redirect.method](login.oauth.google.redirect.path, async () => {});

loginRouter[login.oauth.google.callback.method](login.oauth.google.callback.path, async () => {});

// LinkedIn
loginRouter[login.oauth.linkedin.redirect.method](
  login.oauth.linkedin.redirect.path,
  async () => {},
);

loginRouter[login.oauth.linkedin.callback.method](
  login.oauth.linkedin.callback.path,
  async () => {},
);

// GitHub
loginRouter[login.oauth.github.redirect.method](login.oauth.github.redirect.path, async () => {});

loginRouter[login.oauth.github.callback.method](login.oauth.github.callback.path, async () => {});
