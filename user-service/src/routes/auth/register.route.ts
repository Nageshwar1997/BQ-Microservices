import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { registerResendOtpController, registerSendOtpController } from '@/controllers';
import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import { registerEmailSchema } from '@beautinique/be-zod';
import { Router } from 'express';

export const registerRouter = Router();

const { resendOtp, sendOtp } = GATEWAY_METHODS_AND_PATHS.auth.register;

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
