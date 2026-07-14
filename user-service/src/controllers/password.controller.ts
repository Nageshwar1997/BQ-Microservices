import {
  NotFoundError,
  TooManyRequestsError,
  UnprocessableEntityError,
  ValidationError,
} from '@beautinique/backend-classes';
import type {
  TChangePasswordZodSchema,
  TEmailZodSchema,
  TOtpZodSchema,
  TPasswordsZodSchema,
  TSetPasswordZodSchema,
} from '@beautinique/backend-types';
import { getUser, sanitizeToken } from '@beautinique/backend-utils';
import { HEADERS_MAP, MAX_OTP_RESEND } from '@beautinique/shared-constants';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';

import { redisCache } from '../classes/index.js';
import { jobProducer } from '../configs/index.js';
import { getUserByEmail, getUserById, updateUser } from '../services/index.js';
import type { IUser } from '../types/index.js';
import { getMinimalUser, getObjId } from '../utils/index.js';

export const forgotPasswordSendOtpController = async (req: Request, res: Response) => {
  const { email } = req.body as TEmailZodSchema;
  const user = await getUserByEmail({ email });

  if (user && !user.providers.includes('MANUAL')) {
    // Check if user has MANUAL login
    throw new UnprocessableEntityError(
      `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
    );
  }

  // Store EMAIL & OTP in cache
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

export const forgotPasswordResendOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_MAP.authorization));

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new ValidationError('OTP session expired or invalid');
  }

  // Update OTP & sendCount in cache
  const { otp, sendCount, email } = await redisCache.updateOtpData(token);

  if (sendCount > MAX_OTP_RESEND) {
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

export const forgotPasswordVerifyOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_MAP.authorization));

  const { otp } = req.body as TOtpZodSchema;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (parsedData?.otp !== otp) {
    throw new ValidationError('OTP expired or invalid');
  }

  res.success({ message: 'OTP verified successfully' });
};

export const forgotPasswordSaveController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_MAP.authorization));

  const { password } = req.body as TPasswordsZodSchema;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new ValidationError('OTP session expired or invalid');
  }

  // Check for existing users
  const user = (await getUserByEmail({
    email: parsedData.email,
    lean: false,
  })) as HydratedDocument<IUser> | null;

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isSamePassword = await bcrypt.compare(password, user.password);

  if (isSamePassword) {
    throw new UnprocessableEntityError('New password cannot be same as current password');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;
  await user.save();

  // Delete OTP and Token from Redis
  await redisCache.deleteOtpData(token);

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success({ message: 'Password reset successfully', data: minUser });
};

export const changePasswordController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const { currentPassword, password } = req.body as TChangePasswordZodSchema;

  const user = (await getUserById({
    id: userId,
    lean: false,
    password: true,
  })) as HydratedDocument<IUser>;

  const isCurrentPasswordMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isCurrentPasswordMatch) {
    throw new ValidationError('Current password is incorrect', {
      fieldErrors: { currentPassword: ['Current password is incorrect'] },
    });
  }

  const isSamePassword = await bcrypt.compare(password, user.password);

  if (isSamePassword) {
    throw new UnprocessableEntityError('New password cannot be same as current password', {
      fieldErrors: { password: ['New password cannot be same as current password'] },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;

  const updatedUser = await user.save();

  const minUser = getMinimalUser(updatedUser);

  await redisCache.setUser(minUser);

  res.success({ message: 'Password changed successfully', data: minUser });
};

export const setPasswordController = async (req: Request, res: Response) => {
  const user = getUser(req.user);

  if (user.providers.includes('MANUAL')) {
    throw new UnprocessableEntityError('Password already set. Please use forgot password.');
  }

  const { password } = req.body as TSetPasswordZodSchema;

  const hashedPassword = await bcrypt.hash(password, 10);

  const updatedUser = await updateUser({ _id: getObjId(user._id) }, { password: hashedPassword });

  const minUser = getMinimalUser(updatedUser);

  await redisCache.setUser(minUser);

  res.success({ message: 'Password set successfully', data: minUser });
};
