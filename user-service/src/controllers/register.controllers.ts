import { bullQueue, redisCache } from '@/classes';
import { getUserByEmail } from '@/services';
import { AppError } from '@beautinique/be-classes';
import { MAX_RESEND } from '@beautinique/be-constants';
import { sanitizeToken } from '@beautinique/be-utils';
import type { TRegisterEmail } from '@beautinique/be-zod';
import type { Request, Response } from 'express';

export const registerSendOtpController = async (req: Request, res: Response) => {
  const { email } = req.body as TRegisterEmail;
  const user = await getUserByEmail({ email });

  if (user && user.providers.includes('MANUAL')) {
    throw new AppError({
      message: 'User already exists, please login',
      statusCode: 400,
      code: 'AUTH_ERROR',
      fieldErrors: { email: ['Email already exists'] },
    });
  }

  // Store email in cache
  const { otpToken, sendCount, otp } = await redisCache.setOtpToken(email);

  await bullQueue.addJob({
    queueName: 'email-queue',
    jobName: 'send-otp',
    data: { email, otp },
  });

  res.success(200, 'OTP sent successfully', { data: { otpToken, sendCount } });
};

export const registerResendOtpController = async (req: Request, res: Response) => {
  const rawToken = req.get('Authorization') || '';
  const otpToken = sanitizeToken(rawToken);

  if (!rawToken || !otpToken) {
    throw new AppError({ message: 'Unauthorized', statusCode: 401, code: 'AUTH_ERROR' }); // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
  }

  const { email } = req.body as TRegisterEmail;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpToken(otpToken);

  if (!parsedData || parsedData.email !== email) {
    throw new AppError({
      message: 'OTP session expired or invalid',
      statusCode: 401, // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
      code: 'AUTH_ERROR',
    });
  }

  const { otp, sendCount } = await redisCache.updateOtpToken(otpToken);

  if (sendCount > MAX_RESEND) {
    throw new AppError({
      message: 'Maximum resend attempts reached',
      statusCode: 401, // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
      code: 'AUTH_ERROR',
    });
  }

  await bullQueue.addJob({
    queueName: 'email-queue',
    jobName: 'send-otp',
    data: { email, otp },
  });

  res.success(200, 'OTP resent successfully', { data: { otpToken, sendCount } });
};
