import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import { emailOtpSchema } from '@beautinique/be-zod';
import { Router } from 'express';
import { sendOtpController } from '../controllers';

export const router = Router();

router.post(
  '/send-otp',
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(emailOtpSchema),
  ResponseMiddleware.tryCatch(sendOtpController),
);
