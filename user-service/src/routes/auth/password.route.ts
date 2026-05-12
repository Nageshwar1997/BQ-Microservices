import { checkEmptyRequest, tryCatchResponse, zodValidator } from '@beautinique/be-middlewares';
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
  checkEmptyRequest({ body: true }),
  zodValidator(emailSchema),
  tryCatchResponse(forgotPasswordSendOtpController),
);

passwordRouter[forgot.resendOtp.method](
  forgot.resendOtp.path,
  tryCatchResponse(forgotPasswordResendOtpController),
);

passwordRouter[forgot.verifyOtp.method](
  forgot.verifyOtp.path,
  checkEmptyRequest({ body: true }),
  zodValidator(otpSchema),
  tryCatchResponse(forgotPasswordVerifyOtpController),
);

passwordRouter[forgot.save.method](
  forgot.save.path,
  checkEmptyRequest({ body: true }),
  zodValidator(passwordsSchema),
  tryCatchResponse(forgotPasswordSaveController),
);

passwordRouter[change.method](
  change.path,
  authenticate,
  checkEmptyRequest({ body: true }),
  zodValidator(changePasswordSchema),
  tryCatchResponse<AuthRequest>(changePasswordController),
);

passwordRouter[set.method](
  set.path,
  authenticate,
  checkEmptyRequest({ body: true }),
  zodValidator(setPasswordSchema),
  tryCatchResponse<AuthRequest>(setPasswordController),
);
