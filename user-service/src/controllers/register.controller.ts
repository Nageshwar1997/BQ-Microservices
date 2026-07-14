import {
  BadRequestError,
  ConflictError,
  TooManyRequestsError,
  ValidationError,
} from '@beautinique/backend-classes';
import { MAX_RESEND } from '@beautinique/be-constants';
import { sanitizeToken } from '@beautinique/be-utils';
import type { TEmail, TOtp, TRegister } from '@beautinique/be-zod';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';

import { redisCache } from '../classes/index.js';
import { jobProducer } from '../configs/index.js';
import { HEADERS_KEYS } from '../constants/index.js';
import { createNewUser, getUserByEmail, getUserByPhoneNumber } from '../services/index.js';
import { getMinimalUser } from '../utils/index.js';

export const registerSendOtpController = async (req: Request, res: Response) => {
  const { email } = req.body as TEmail;
  const user = await getUserByEmail({ email });

  if (user?.providers.includes('MANUAL')) {
    throw new ConflictError('User already exists, please login', {
      fieldErrors: { email: ['Email already exists'] },
    });
  }

  // Store email in cache
  const { otp, token } = await redisCache.setOtpData(email);

  try {
    /* ---------------- SEND OTP ---------------- */

    await jobProducer.addJob('mail-queue', 'send-otp', { email, otp });
  } catch (error) {
    /* ---------------- ROLLBACK ---------------- */

    // Queue add failed, remove OTP from Redis
    await redisCache.deleteOtpData(token);

    throw error;
  }

  res.success({ message: 'OTP sent successfully', data: token });
};

export const registerResendOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_KEYS.authorization) ?? '');

  if (!token) {
    throw new BadRequestError('Invalid or expired session');
  }

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new ValidationError('OTP session expired or invalid');
  }

  const { otp, sendCount, email } = await redisCache.updateOtpData(token);

  if (sendCount > MAX_RESEND) {
    throw new TooManyRequestsError('Maximum resend attempts reached');
  }

  try {
    /* ---------------- SEND OTP ---------------- */

    await jobProducer.addJob('mail-queue', 'send-otp', { email, otp });
  } catch (error) {
    /* ---------------- ROLLBACK ---------------- */

    // Queue add failed, remove OTP from Redis
    await redisCache.deleteOtpData(token);

    throw error;
  }

  res.success({ message: 'OTP resent successfully', data: sendCount });
};

export const registerVerifyOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_KEYS.authorization) ?? '');

  if (!token) {
    throw new BadRequestError('Invalid or expired session');
  }

  const { otp } = req.body as TOtp;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (parsedData?.otp !== otp) {
    throw new ValidationError('OTP expired or invalid');
  }

  res.success({ message: 'OTP verified successfully' });
};

export const registerAndSaveController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_KEYS.authorization) ?? '');

  if (!token) {
    throw new BadRequestError('Invalid or expired session');
  }

  const { firstName, lastName, password, phoneNumber } = req.body as TRegister;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new ValidationError('OTP session expired or invalid');
  }

  // Check for existing users
  const [emailUser, phoneUser] = await Promise.all([
    getUserByEmail({ email: parsedData.email, lean: false }),
    getUserByPhoneNumber({ phoneNumber, lean: false }),
  ]);

  let user = emailUser ?? phoneUser;

  if (phoneUser && phoneUser._id.toString() !== emailUser?._id.toString()) {
    throw new ConflictError('Phone number already exists', {
      fieldErrors: { phoneNumber: ['Phone number already exists'] },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

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
      throw new ConflictError('Email already exists', {
        fieldErrors: { email: ['Email already exists'] },
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
      avatar: '',
    });
  }

  // Delete OTP and Token from Redis
  await redisCache.deleteOtpData(token);

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success({ message: 'User registered successfully', data: minUser });
};
