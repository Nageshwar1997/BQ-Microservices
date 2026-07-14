import { checkEmptyRequest, tryCatchResponse, zodValidator } from '@beautinique/be-middlewares';
import { emailSchema, otpSchema, registerSchema } from '@beautinique/be-zod';
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
  zodValidator(emailSchema),
  tryCatchResponse(registerSendOtpController),
);

registerRouter[resendOtp.method](resendOtp.path, tryCatchResponse(registerResendOtpController));

registerRouter[verifyOtp.method](
  verifyOtp.path,
  checkEmptyRequest({ body: true }),
  zodValidator(otpSchema),
  tryCatchResponse(registerVerifyOtpController),
);

registerRouter[saveUser.method](
  saveUser.path,
  checkEmptyRequest({ body: true }),
  zodValidator(registerSchema),
  tryCatchResponse(registerAndSaveController),
);
