import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import {
  changePasswordSchema,
  emailSchema,
  otpSchema,
  passwordsSchema,
  setPasswordSchema,
} from '@beautinique/be-zod';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../../constants';
import {
  changePasswordController,
  forgotPasswordResendOtpController,
  forgotPasswordSaveController,
  forgotPasswordSendOtpController,
  forgotPasswordVerifyOtpController,
  setPasswordController,
} from '../../controllers';
import { authenticate } from '../../middlewares';
import type { AuthRequest } from '../../types';

export const passwordRouter = Router();

const { forgot, change, set } = METHODS_AND_PATHS.auth.password;

passwordRouter[forgot.sendOtp.method](
  forgot.sendOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(emailSchema),
  ResponseMiddleware.tryCatch(forgotPasswordSendOtpController),
);

passwordRouter[forgot.resendOtp.method](
  forgot.resendOtp.path,
  ResponseMiddleware.tryCatch(forgotPasswordResendOtpController),
);

passwordRouter[forgot.verifyOtp.method](
  forgot.verifyOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(otpSchema),
  ResponseMiddleware.tryCatch(forgotPasswordVerifyOtpController),
);

passwordRouter[forgot.save.method](
  forgot.save.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(passwordsSchema),
  ResponseMiddleware.tryCatch(forgotPasswordSaveController),
);

passwordRouter[change.method](
  change.path,
  authenticate,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(changePasswordSchema),
  ResponseMiddleware.tryCatch<AuthRequest>(changePasswordController),
);

passwordRouter[set.method](
  set.path,
  authenticate,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(setPasswordSchema),
  ResponseMiddleware.tryCatch<AuthRequest>(setPasswordController),
);
