import { bullQueue, redisCache } from '@/classes';
import { createNewUser, getUserByEmail, getUserByPhoneNumber } from '@/services';
import type { IUser, IUserDoc } from '@/types';
import { AppError } from '@beautinique/be-classes';
import { MAX_RESEND } from '@beautinique/be-constants';
import { sanitizeToken } from '@beautinique/be-utils';
import type { TRegister, TRegisterEmail, TRegisterOtp } from '@beautinique/be-zod';
import bcrypt from 'bcryptjs';
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
  const { otpToken, sendCount, otp, email: otpEmail } = await redisCache.setOtpToken(email);

  await bullQueue.addJob({
    queueName: 'email-queue',
    jobName: 'send-otp',
    data: { email: otpEmail, otp },
  });

  res.success(200, 'OTP sent successfully', { data: { otpToken, sendCount, email: otpEmail } });
};

export const registerResendOtpController = async (req: Request, res: Response) => {
  const rawToken = req.get('Authorization') || '';
  const otpToken = sanitizeToken(rawToken);

  if (!rawToken || !otpToken) {
    throw new AppError({
      message: 'Invalid or expired session',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { email } = req.body as TRegisterEmail;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpToken(otpToken);

  if (!parsedData || parsedData.email !== email) {
    throw new AppError({
      message: 'OTP session expired or invalid',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { otp, sendCount } = await redisCache.updateOtpToken(otpToken);

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

  res.success(200, 'OTP resent successfully', { data: { otpToken, sendCount } });
};

export const registerVerifyOtpController = async (req: Request, res: Response) => {
  const rawToken = req.get('Authorization') || '';
  const otpToken = sanitizeToken(rawToken);

  if (!rawToken || !otpToken) {
    throw new AppError({
      message: 'Invalid or expired session',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { otp } = req.body as TRegisterOtp;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpToken(otpToken);

  if (!parsedData || parsedData.otp !== otp) {
    throw new AppError({
      message: 'OTP expired or invalid',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  res.success(200, 'OTP verified successfully', { data: { otpToken, email: parsedData.email } });
};

export const registerAndSaveController = async (req: Request, res: Response) => {
  const rawToken = req.get('Authorization') || '';
  const otpToken = sanitizeToken(rawToken);

  if (!rawToken || !otpToken) {
    throw new AppError({
      message: 'Invalid or expired session',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { email, firstName, lastName, password, phoneNumber } = req.body as TRegister;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpToken(otpToken);

  if (!parsedData || parsedData.email !== email) {
    throw new AppError({
      message: 'OTP session expired or invalid',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  // Check for existing users
  const [emailUser, phoneUser] = await Promise.all([
    getUserByEmail({ email, lean: false }),
    getUserByPhoneNumber({ phoneNumber, lean: false }),
  ]);
  let user = (emailUser || phoneUser) as IUserDoc | IUser;

  if (phoneUser && phoneUser._id.toString() !== emailUser?._id.toString()) {
    throw new AppError({
      message: 'Phone number already exists',
      fieldErrors: { phoneNumber: ['Phone number already exists'] },
      code: 'AUTH_ERROR',
      statusCode: 400,
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  if (user) {
    // User exists → oAuth-only
    if (!user.providers.includes('MANUAL') && 'save' in user) {
      user.password = hashedPassword;
      user.providers.push('MANUAL');
      user.firstName = firstName;
      user.lastName = lastName;
      user.phoneNumber = phoneNumber;
      await user.save();
    } else {
      throw new AppError({
        message: 'Email already exists',
        fieldErrors: { email: ['Email already exists'] },
        code: 'AUTH_ERROR',
        statusCode: 400,
      });
    }
  } else {
    // Completely new user → create
    user = await createNewUser({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
      providers: ['MANUAL'],
      role: 'USER',
      status: 'ACTIVE',
    });
  }

  // Delete OTP and Token from Redis
  await redisCache.deleteOtpToken(otpToken);

  const { password: _, ...restUser } = 'toObject' in user ? user.toObject() : user;

  await redisCache.setUser(restUser);

  res.success(201, 'User registered successfully', { user: restUser });
};
