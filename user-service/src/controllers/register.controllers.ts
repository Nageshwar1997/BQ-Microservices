import { AppError } from '@beautinique/be-classes';
import { MAX_RESEND } from '@beautinique/be-constants';
import { sanitizeToken } from '@beautinique/be-utils';
import type { TEmail, TOtp, TRegister } from '@beautinique/be-zod';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { bullQueue, redisCache } from '../classes';
import { createNewUser, getUserByEmail, getUserByPhoneNumber } from '../services';
import type { IUser, IUserDoc } from '../types';
import { getMinimalUser } from '../utils';

export const registerSendOtpController = async (req: Request, res: Response) => {
  const { email } = req.body as TEmail;
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
  const { otp, token } = await redisCache.setOtpData(email);

  await bullQueue.addJob({
    queueName: 'email-queue',
    jobName: 'send-otp',
    data: { email, otp },
  });

  res.success(200, 'OTP sent successfully', { token });
};

export const registerResendOtpController = async (req: Request, res: Response) => {
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

export const registerVerifyOtpController = async (req: Request, res: Response) => {
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

export const registerAndSaveController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get('Authorization') || '');

  if (!token) {
    throw new AppError({
      message: 'Invalid or expired session',
      statusCode: 400,
      code: 'AUTH_ERROR',
    });
  }

  const { firstName, lastName, password, phoneNumber } = req.body as TRegister;

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
  const [emailUser, phoneUser] = await Promise.all([
    getUserByEmail({ email: parsedData.email, lean: false }),
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
      email: parsedData.email,
      phoneNumber,
      password: hashedPassword,
      providers: ['MANUAL'],
      role: 'USER',
      status: 'ACTIVE',
    });
  }

  // Delete OTP and Token from Redis
  await redisCache.deleteOtpData(token);

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success(201, 'User registered successfully', { user: minUser });
};
