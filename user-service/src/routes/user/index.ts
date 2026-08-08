import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import {
  changePasswordZodSchema,
  setPasswordZodSchema,
  updateUserZodSchema,
  validateZod,
} from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import {
  changePasswordController,
  getSessionUserController,
  promoteUserRoleController,
  setPasswordController,
  updateUserController,
} from '../../controllers/index.js';
import { authenticate, authorize } from '../../middlewares/index.js';
import {
  promoteUserRoleBodyZodSchema,
  promoteUserRoleParamsZodSchema,
} from '../../schemas/index.js';

export const userRouter = Router();

const { session, update, promoteRole, password } = METHODS_AND_PATHS.user;

userRouter[session.method](session.path, authenticate, tryCatchResponse(getSessionUserController));

userRouter[update.method](
  update.path,
  authenticate,
  checkEmptyRequest({ body: true }),
  validateZod({ body: updateUserZodSchema }),
  tryCatchResponse(updateUserController),
);

userRouter[password.change.method](
  password.change.path,
  authenticate,
  checkEmptyRequest({ body: true }),
  validateZod({ body: changePasswordZodSchema }),
  tryCatchResponse(changePasswordController),
);

userRouter[password.set.method](
  password.set.path,
  authenticate,
  checkEmptyRequest({ body: true }),
  validateZod({ body: setPasswordZodSchema }),
  tryCatchResponse(setPasswordController),
);

/**
 * Internal - called by organization-service's `createSeller` flow, not by
 * end users. `organization-service` forwards the calling admin's
 * `X-User-Id`/`X-User-Role` headers, so `authorize` below works exactly like
 * it does for any other admin-only route.
 */
userRouter[promoteRole.method](
  promoteRole.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ body: true, params: true }),
  validateZod({ params: promoteUserRoleParamsZodSchema, body: promoteUserRoleBodyZodSchema }),
  tryCatchResponse(promoteUserRoleController),
);
