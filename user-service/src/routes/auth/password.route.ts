import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import {
  emailZodSchema,
  otpZodSchema,
  passwordsZodSchema,
  validateZod,
} from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import {
  forgotPasswordResendOtpController,
  forgotPasswordSaveController,
  forgotPasswordSendOtpController,
  forgotPasswordVerifyOtpController,
} from '../../controllers/index.js';

export const passwordRouter = Router();

const { forgot } = METHODS_AND_PATHS.auth.password;

passwordRouter[forgot.sendOtp.method](
  forgot.sendOtp.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: emailZodSchema }),
  tryCatchResponse(forgotPasswordSendOtpController),
);

passwordRouter[forgot.resendOtp.method](
  forgot.resendOtp.path,
  tryCatchResponse(forgotPasswordResendOtpController),
);

passwordRouter[forgot.verifyOtp.method](
  forgot.verifyOtp.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: otpZodSchema }),
  tryCatchResponse(forgotPasswordVerifyOtpController),
);

passwordRouter[forgot.save.method](
  forgot.save.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: passwordsZodSchema }),
  tryCatchResponse(forgotPasswordSaveController),
);
