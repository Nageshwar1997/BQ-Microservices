import { AppError } from '@beautinique/be-classes';
import { MAX_RESEND } from '@beautinique/be-constants';
import { sanitizeToken } from '@beautinique/be-utils';
import type { TEmail, TOtp, TPasswords } from '@beautinique/be-zod';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { bullQueue, redisCache } from '../classes';
import { getUserByEmail } from '../services';
import type { IUserDoc } from '../types';
import { getMinimalUser } from '../utils';

export const forgotPasswordSendOtpController = async (req: Request, res: Response) => {
  const { email } = req.body as TEmail;
  const user = await getUserByEmail({ email });

  if (user && !user.providers.includes('MANUAL')) {
    // Check if user has MANUAL login
    throw new AppError({
      message: `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
      code: 'AUTH_ERROR',
      statusCode: 400,
    });
  }

  // Store email in cache
  const { otp, token } = await redisCache.setOtpData(email);

  await bullQueue.addJob({
    queueName: 'email-queue',
    jobName: 'send-otp',
    data: { email, otp },
  });

  res.success(200, 'OTP sent successfully', { token });
};

export const forgotPasswordResendOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get('Authorization') || '');

  if (!token) {
    throw new AppError({
      message: 'Invalid or expired session',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new AppError({
      message: 'OTP session expired or invalid',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { otp, sendCount, email } = await redisCache.updateOtpData(token);

  if (sendCount > MAX_RESEND) {
    throw new AppError({
      message: 'Maximum resend attempts reached',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  await bullQueue.addJob({
    queueName: 'email-queue',
    jobName: 'send-otp',
    data: { email, otp },
  });

  res.success(200, 'OTP resent successfully', { sendCount });
};

export const forgotPasswordVerifyOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get('Authorization') || '');

  if (!token) {
    throw new AppError({
      message: 'Invalid or expired session',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { otp } = req.body as TOtp;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData || parsedData.otp !== otp) {
    throw new AppError({
      message: 'OTP expired or invalid',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  res.success(200, 'OTP verified successfully');
};

export const forgotPasswordSaveController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get('Authorization') || '');

  if (!token) {
    throw new AppError({
      message: 'Invalid or expired session',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { password } = req.body as TPasswords;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new AppError({
      message: 'OTP session expired or invalid',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  // Check for existing users
  const user = (await getUserByEmail({ email: parsedData.email, lean: false })) as IUserDoc;

  if (!user) {
    throw new AppError({
      message: 'User not found',
      statusCode: 404,
      code: 'AUTH_ERROR',
    });
  }

  const currentPassword = bcrypt.compareSync(password, user.password);

  if (currentPassword) {
    throw new AppError({
      message: 'New password cannot be same as current password',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  user.password = hashedPassword;
  await user.save();

  // Delete OTP and Token from Redis
  await redisCache.deleteOtpData(token);

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success(201, 'Password changed successfully', { user: minUser });
};
