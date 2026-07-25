import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import {
  emailZodSchema,
  otpZodSchema,
  registerZodSchema,
  validateZod,
} from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import {
  registerAndSaveController,
  registerResendOtpController,
  registerSendOtpController,
  registerVerifyOtpController,
} from '../../controllers/index.js';

export const registerRouter = Router();

const { resendOtp, sendOtp, verifyOtp, saveUser } = METHODS_AND_PATHS.auth.register;

registerRouter[sendOtp.method](
  sendOtp.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: emailZodSchema }),
  tryCatchResponse(registerSendOtpController),
);

registerRouter[resendOtp.method](resendOtp.path, tryCatchResponse(registerResendOtpController));

registerRouter[verifyOtp.method](
  verifyOtp.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: otpZodSchema }),
  tryCatchResponse(registerVerifyOtpController),
);

registerRouter[saveUser.method](
  saveUser.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: registerZodSchema }),
  tryCatchResponse(registerAndSaveController),
);
