import { ConflictError, TooManyRequestsError, ValidationError } from '@beautinique/backend-classes';
import type {
  TEmailZodSchema,
  TOtpZodSchema,
  TRegisterZodSchema,
} from '@beautinique/backend-types';
import { sanitizeToken } from '@beautinique/backend-utils';
import {
  AUTH_PROVIDER_MAP,
  HEADERS_MAP,
  MAX_OTP_RESEND,
  USER_ROLE_MAP,
  USER_STATUS_MAP,
} from '@beautinique/shared-constants';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';

import { jobProducer, redisCacheManager } from '../../configs/index.js';
import { createNewUser, getUserByEmail, getUserByPhoneNumber } from '../../services/index.js';
import { getMinimalUser } from '../../utils/index.js';

export const registerSendOtpController = async (req: Request, res: Response) => {
  const { email } = req.body as TEmailZodSchema;
  const user = await getUserByEmail({ email });

  if (user?.providers.includes(AUTH_PROVIDER_MAP.MANUAL)) {
    throw new ConflictError('User already exists, please login', {
      fieldErrors: { email: ['Email already exists'] },
    });
  }

  // Store email in cache
  const { otp, token } = await redisCacheManager.token.setOtpData(email);

  try {
    /* ---------------- SEND OTP ---------------- */

    await jobProducer.addJob('mail-queue', 'send-otp', { email, otp });
  } catch (error) {
    /* ---------------- ROLLBACK ---------------- */

    // Queue add failed, remove OTP from Redis
    await redisCacheManager.token.deleteOtpData(token);

    throw error;
  }

  res.success({ message: 'OTP sent successfully', data: token });
};

export const registerResendOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_MAP.authorization));

  //  Get parsed data from cache
  const parsedData = await redisCacheManager.token.getOtpData(token);

  if (!parsedData) {
    throw new ValidationError('OTP session expired or invalid');
  }

  const { otp, sendCount, email } = await redisCacheManager.token.updateOtpData(token);

  if (sendCount > MAX_OTP_RESEND) {
    throw new TooManyRequestsError('Maximum resend attempts reached');
  }

  try {
    /* ---------------- SEND OTP ---------------- */

    await jobProducer.addJob('mail-queue', 'send-otp', { email, otp });
  } catch (error) {
    /* ---------------- ROLLBACK ---------------- */

    // Queue add failed, remove OTP from Redis
    await redisCacheManager.token.deleteOtpData(token);

    throw error;
  }

  res.success({ message: 'OTP resent successfully', data: sendCount });
};

export const registerVerifyOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_MAP.authorization));

  const { otp } = req.body as TOtpZodSchema;

  //  Get parsed data from cache
  const parsedData = await redisCacheManager.token.getOtpData(token);

  if (parsedData?.otp !== otp) {
    throw new ValidationError('OTP expired or invalid');
  }

  res.success({ message: 'OTP verified successfully' });
};

export const registerAndSaveController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_MAP.authorization));

  const { firstName, lastName, password, phoneNumber } = req.body as TRegisterZodSchema;

  //  Get parsed data from cache
  const parsedData = await redisCacheManager.token.getOtpData(token);

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
    if (!user.providers.includes(AUTH_PROVIDER_MAP.MANUAL) && 'save' in user) {
      user.password = hashedPassword;
      user.providers.push(AUTH_PROVIDER_MAP.MANUAL);
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
      providers: [AUTH_PROVIDER_MAP.MANUAL],
      role: USER_ROLE_MAP.USER,
      status: USER_STATUS_MAP.ACTIVE,
      avatar: '',
    });
  }

  // Delete OTP and Token from Redis
  await redisCacheManager.token.deleteOtpData(token);

  const minUser = getMinimalUser(user);

  await redisCacheManager.user.setUser(minUser);

  res.success({ message: 'User registered successfully', data: minUser });
};
