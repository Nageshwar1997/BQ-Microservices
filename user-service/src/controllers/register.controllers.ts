import { bullQueue, redisCache } from '@/classes';
import { getUserByEmail } from '@/services';
import { AppError } from '@beautinique/be-classes';
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
