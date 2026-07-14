import { tryCatchResponse } from '@beautinique/backend-response';
import { checkEmptyRequest, zodValidator } from '@beautinique/be-middlewares';
import { loginSchema } from '@beautinique/be-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import {
  githubCallbackController,
  githubRedirectController,
  googleCallbackController,
  googleRedirectController,
  linkedinCallbackController,
  linkedinRedirectController,
  manualLoginController,
} from '../../controllers/index.js';

export const loginRouter = Router();

const { login } = METHODS_AND_PATHS.auth;

// Manual
loginRouter[login.manual.method](
  login.manual.path,
  checkEmptyRequest({ body: true }),
  zodValidator(loginSchema),
  tryCatchResponse(manualLoginController),
);

// Google
loginRouter[login.oauth.google.redirect.method](
  login.oauth.google.redirect.path,
  tryCatchResponse(googleRedirectController),
);

loginRouter[login.oauth.google.callback.method](
  login.oauth.google.callback.path,
  checkEmptyRequest({ query: true }),
  tryCatchResponse(googleCallbackController),
);

// LinkedIn
loginRouter[login.oauth.linkedin.redirect.method](
  login.oauth.linkedin.redirect.path,
  tryCatchResponse(linkedinRedirectController),
);

loginRouter[login.oauth.linkedin.callback.method](
  login.oauth.linkedin.callback.path,
  checkEmptyRequest({ query: true }),
  tryCatchResponse(linkedinCallbackController),
);

// GitHub
loginRouter[login.oauth.github.redirect.method](
  login.oauth.github.redirect.path,
  tryCatchResponse(githubRedirectController),
);

loginRouter[login.oauth.github.callback.method](
  login.oauth.github.callback.path,
  checkEmptyRequest({ query: true }),
  tryCatchResponse(githubCallbackController),
);
