import { METHODS_AND_PATHS } from '@/constants';
import {
  registerAndSaveController,
  registerResendOtpController,
  registerSendOtpController,
  registerVerifyOtpController,
} from '@/controllers';
import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import { registerEmailSchema, registerOtpSchema, registerSchema } from '@beautinique/be-zod';
import { Router } from 'express';

export const registerRouter = Router();

const { resendOtp, sendOtp, verifyOtp, saveUser } = METHODS_AND_PATHS.auth.register;

registerRouter[sendOtp.method](
  sendOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(registerEmailSchema),
  ResponseMiddleware.tryCatch(registerSendOtpController),
);

registerRouter[resendOtp.method](
  resendOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(registerEmailSchema),
  ResponseMiddleware.tryCatch(registerResendOtpController),
);

registerRouter[verifyOtp.method](
  verifyOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(registerOtpSchema),
  ResponseMiddleware.tryCatch(registerVerifyOtpController),
);

registerRouter[saveUser.method](
  saveUser.path,
  RequestMiddleware.emptyRequest({ body: true, file: false }),
  ZodMiddleware.validateSchema(registerSchema),
  ResponseMiddleware.tryCatch(registerAndSaveController),
);
