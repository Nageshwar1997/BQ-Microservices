import { bullQueue, redisCache } from '@/classes';
import { logger } from '@/configs';
import { createNewUser, getUserByEmail, getUserByPhoneNumber } from '@/services';
import { generateJwtToken } from '@/utils';
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

export const registerVerifyOtpController = async (req: Request, res: Response) => {
  const rawToken = req.get('Authorization') || '';
  const otpToken = sanitizeToken(rawToken);

  if (!rawToken || !otpToken) {
    throw new AppError({ message: 'Unauthorized', statusCode: 401, code: 'AUTH_ERROR' }); // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
  }

  const { otp } = req.body as TRegisterOtp;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpToken(otpToken);

  if (!parsedData || parsedData.otp !== otp) {
    throw new AppError({
      message: 'OTP expired or invalid',
      statusCode: 401, // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
      code: 'AUTH_ERROR',
    });
  }

  res.success(200, 'OTP verified successfully', { data: { otpToken } });
};

export const registerAndSaveController = async (req: Request, res: Response) => {
  const rawToken = req.get('Authorization') || '';
  const otpToken = sanitizeToken(rawToken);

  if (!rawToken || !otpToken) {
    throw new AppError({ message: 'Unauthorized', statusCode: 401, code: 'AUTH_ERROR' }); // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
  }

  const { email, firstName, lastName, password, phoneNumber } = req.body as TRegister;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpToken(otpToken);

  if (!parsedData || parsedData.email !== email) {
    throw new AppError({
      message: 'Unauthorized',
      statusCode: 401, // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
      code: 'AUTH_ERROR',
    });
  }

  // Check for existing users
  const [emailUser, phoneUser] = await Promise.all([
    getUserByEmail({ email, lean: false }),
    getUserByPhoneNumber({ phoneNumber }),
  ]);
  let user = emailUser || phoneUser;

  if (phoneUser && phoneUser._id.toString() !== emailUser?._id.toString()) {
    throw new AppError({
      message: 'Phone number already exists',
      fieldErrors: { phoneNumber: ['Phone number already exists'] },
      code: 'AUTH_ERROR',
      statusCode: 400,
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    if (user) {
      // User exists → oAuth-only
      if (!user.providers.includes('MANUAL')) {
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
          statusCode: 401, // NOTE - Don't change statusCode anyway, In frontend we handled logic base on it
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

    const { password: _, ...restUser } = user.toObject();

    await redisCache.setUser(restUser);

    const token = generateJwtToken(user._id);

    res.success(201, 'User registered successfully', { token, user: restUser });
  } catch (error) {
    // if (avatar) await MediaModule.Utils.singleImageRemover(avatar, 'image');
    logger.error('❌ Failed to register user:', error);
    throw new AppError({
      message: (error as unknown as Error).message || 'Failed to register user',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }

  res.success(200, 'OTP verified successfully', { data: { otpToken } });
};
