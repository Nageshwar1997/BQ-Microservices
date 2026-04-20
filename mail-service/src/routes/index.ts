import { sendOtpController } from '@/controllers';
import { RequestMiddleware, ResponseMiddleware, ZodMiddleware } from '@beautinique/be-middlewares';
import { sendOtpMailSchema } from '@beautinique/be-zod';
import { Router } from 'express';

export const router = Router();

router.post(
  '/send-otp',
  RequestMiddleware.emptyRequest({ body: true }),
  ZodMiddleware.validateSchema(sendOtpMailSchema),
  ResponseMiddleware.tryCatch(sendOtpController),
);
