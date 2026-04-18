import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { registerControllers } from '@/controllers';
import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import { registerEmailSchema } from '@beautinique/be-zod';
import { Router } from 'express';

export const registerRouter = Router();

const { sendOtp } = GATEWAY_METHODS_AND_PATHS.auth.register;

registerRouter[sendOtp.method](
  sendOtp.path,
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(registerEmailSchema),
  ResponseMiddleware.tryCatch(registerControllers.sendOtp),
);
