import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import { emailSchema, otpSchema, passwordsSchema } from '@beautinique/be-zod';
import { Router } from 'express';
import { METHODS_AND_PATHS } from '../../constants';
import {
  forgotPasswordResendOtpController,
  forgotPasswordSaveController,
  forgotPasswordSendOtpController,
  forgotPasswordVerifyOtpController,
} from '../../controllers';

export const passwordRouter = Router();

const { forgot } = METHODS_AND_PATHS.auth.password;

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
