import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import {
  registerResendOtpController,
  registerSendOtpController,
  registerVerifyOtpController,
} from '@/controllers';
import { envs } from '@/envs';
import {
  MulterMiddleware,
  RequestMiddleware,
  ResponseMiddleware,
  ZodMiddleware,
} from '@beautinique/be-middlewares';
import { registerEmailSchema, registerOtpSchema, registerSchema } from '@beautinique/be-zod';
import { Router } from 'express';

export const registerRouter = Router();

const { resendOtp, sendOtp, verifyOtp, saveUser } = GATEWAY_METHODS_AND_PATHS.auth.register;

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
  MulterMiddleware.validate({ type: 'single', fieldName: 'avatar', isDev: envs.is_dev }),
  RequestMiddleware.emptyRequest({ body: true, file: false }),
  ZodMiddleware.validateSchema(registerSchema),
  ResponseMiddleware.tryCatch(registerVerifyOtpController),
);
