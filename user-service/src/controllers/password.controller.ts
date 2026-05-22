import { AppError } from '@beautinique/be-classes';
import { MAX_RESEND } from '@beautinique/be-constants';
import { bullQueue } from '@beautinique/be-jobs';
import { sanitizeToken } from '@beautinique/be-utils';
import type { TChangePassword, TEmail, TOtp, TPasswords, TSetPassword } from '@beautinique/be-zod';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { redisCache } from '../classes';
import { HEADERS_KEYS } from '../constants';
import { getUserByEmail, getUserById, updateUser } from '../services';
import type { AuthRequest, IUserDoc } from '../types';
import { getMinimalUser, getObjId } from '../utils';

export const forgotPasswordSendOtpController = async (req: Request, res: Response) => {
  const { email } = req.body as TEmail;
  const user = await getUserByEmail({ email });

  if (user && !user.providers.includes('MANUAL')) {
    // Check if user has MANUAL login
    throw new AppError({
      message: `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  // Store EMAIL & OTP in cache
  const { otp, token } = await redisCache.setOtpData(email);

  try {
    /* ---------------- SEND OTP ---------------- */

    await bullQueue.addJob({ queueName: 'mail-queue', jobName: 'send-otp', data: { email, otp } });
  } catch (error) {
    /* ---------------- ROLLBACK ---------------- */

    // Queue add failed, remove OTP from Redis
    await redisCache.deleteOtpData(token);

    throw error;
  }

  res.success(200, 'OTP sent successfully', { token });
};

export const forgotPasswordResendOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_KEYS.authorization) || '');

  if (!token) {
    throw new AppError({ message: 'Invalid or expired session', code: 'BAD_REQUEST' });
  }

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new AppError({ message: 'OTP session expired or invalid', code: 'VALIDATION_ERROR' });
  }

  // Update OTP & sendCount in cache
  const { otp, sendCount, email } = await redisCache.updateOtpData(token);

  if (sendCount > MAX_RESEND) {
    throw new AppError({ message: 'Maximum resend attempts reached', code: 'TOO_MANY_REQUESTS' });
  }

  try {
    /* ---------------- SEND OTP ---------------- */

    await bullQueue.addJob({ queueName: 'mail-queue', jobName: 'send-otp', data: { email, otp } });
  } catch (error) {
    /* ---------------- ROLLBACK ---------------- */

    // Queue add failed, remove OTP from Redis
    await redisCache.deleteOtpData(token);

    throw error;
  }
  res.success(200, 'OTP resent successfully', { sendCount });
};

export const forgotPasswordVerifyOtpController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_KEYS.authorization) || '');

  if (!token) {
    throw new AppError({ message: 'Invalid or expired session', code: 'BAD_REQUEST' });
  }

  const { otp } = req.body as TOtp;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData || parsedData.otp !== otp) {
    throw new AppError({ message: 'OTP expired or invalid', code: 'VALIDATION_ERROR' });
  }

  res.success(200, 'OTP verified successfully');
};

export const forgotPasswordSaveController = async (req: Request, res: Response) => {
  const token = sanitizeToken(req.get(HEADERS_KEYS.authorization) || '');

  if (!token) {
    throw new AppError({ message: 'Invalid or expired session', code: 'BAD_REQUEST' });
  }

  const { password } = req.body as TPasswords;

  //  Get parsed data from cache
  const parsedData = await redisCache.getOtpData(token);

  if (!parsedData) {
    throw new AppError({ message: 'OTP session expired or invalid', code: 'VALIDATION_ERROR' });
  }

  // Check for existing users
  const user = (await getUserByEmail({ email: parsedData.email, lean: false })) as IUserDoc;

  if (!user) {
    throw new AppError({ message: 'User not found', code: 'NOT_FOUND' });
  }

  const isSamePassword = await bcrypt.compare(password, user.password);

  if (isSamePassword) {
    throw new AppError({
      message: 'New password cannot be same as current password',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;
  await user.save();

  // Delete OTP and Token from Redis
  await redisCache.deleteOtpData(token);

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success(200, 'Password reset successfully', { user: minUser });
};

export const changePasswordController = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
  }

  const { currentPassword, password } = req.body as TChangePassword;

  const user = (await getUserById({ id: userId, lean: false, password: true })) as IUserDoc;

  const isCurrentPasswordMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isCurrentPasswordMatch) {
    throw new AppError({
      message: 'Current password is incorrect',
      code: 'VALIDATION_ERROR',
      fieldErrors: { currentPassword: ['Current password is incorrect'] },
    });
  }

  const isSamePassword = await bcrypt.compare(password, user.password);

  if (isSamePassword) {
    throw new AppError({
      message: 'New password cannot be same as current password',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { password: ['New password cannot be same as current password'] },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;

  const updatedUser = await user.save();

  const minUser = getMinimalUser(updatedUser);

  await redisCache.setUser(minUser);

  res.success(200, 'Password changed successfully', { user: minUser });
};

export const setPasswordController = async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
  } else if (user.providers.includes('MANUAL')) {
    throw new AppError({
      message: 'Password already set. Please use forgot password.',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  const { password } = req.body as TSetPassword;

  const hashedPassword = await bcrypt.hash(password, 10);

  const updatedUser = await updateUser({ _id: getObjId(user._id) }, { password: hashedPassword });

  const minUser = getMinimalUser(updatedUser);

  await redisCache.setUser(minUser);

  res.success(200, 'Password set successfully', { user: minUser });
};
