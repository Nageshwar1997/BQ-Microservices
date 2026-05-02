import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import { emailSchema, otpSchema, registerSchema } from '@beautinique/be-zod';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../../constants';
import {
  registerAndSaveController,
  registerResendOtpController,
  registerSendOtpController,
  registerVerifyOtpController,
} from '../../controllers';

export const registerRouter = Router();

const { resendOtp, sendOtp, verifyOtp, saveUser } = METHODS_AND_PATHS.auth.register;

registerRouter[sendOtp.method](
  sendOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(emailSchema),
  ResponseMiddleware.tryCatch(registerSendOtpController),
);

registerRouter[resendOtp.method](
  resendOtp.path,
  ResponseMiddleware.tryCatch(registerResendOtpController),
);

registerRouter[verifyOtp.method](
  verifyOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(otpSchema),
  ResponseMiddleware.tryCatch(registerVerifyOtpController),
);

registerRouter[saveUser.method](
  saveUser.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(registerSchema),
  ResponseMiddleware.tryCatch(registerAndSaveController),
);
