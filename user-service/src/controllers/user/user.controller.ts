import {
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
} from '@beautinique/backend-classes';
import { AUTH_PROVIDER_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type {
  TChangePasswordZodSchema,
  TSetPasswordZodSchema,
  TUpdateUserZodSchema,
} from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';

import { redisCacheManager } from '../../configs/index.js';
import { User } from '../../models/index.js';
import { getUserById, updateUser } from '../../services/index.js';
import type { IUser } from '../../types/index.js';
import { getMinimalUser } from '../../utils/index.js';

export const getSessionUserController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const user = await redisCacheManager.user.getUser(userId);

  res.success({ message: 'User details fetched successfully.', data: user });
};

export const updateUserController = async (req: Request, res: Response) => {
  const loggedInUser = getUser(req.user);

  const userId = getObjId(loggedInUser._id);

  const body = req.body as TUpdateUserZodSchema;

  const user = await User.findByIdAndUpdate(userId, body, { new: true });

  if (!user) throw new NotFoundError('User not found');

  const minimalUser = getMinimalUser(user);

  res.locals.afterResponse?.push(async () => {
    await redisCacheManager.user.updateUser(minimalUser);
  });

  res.success({ message: 'Profile updated successfully.', data: minimalUser });
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

  await redisCacheManager.user.setUser(minUser);

  res.success({ message: 'Password changed successfully', data: minUser });
};

export const setPasswordController = async (req: Request, res: Response) => {
  const user = getUser(req.user);

  if (user.providers.includes(AUTH_PROVIDER_MAP.MANUAL)) {
    throw new UnprocessableEntityError('Password already set. Please use forgot password.');
  }

  const { password } = req.body as TSetPasswordZodSchema;

  const hashedPassword = await bcrypt.hash(password, 10);

  const updatedUser = await updateUser({ _id: getObjId(user._id) }, { password: hashedPassword });

  const minUser = getMinimalUser(updatedUser);

  await redisCacheManager.user.setUser(minUser);

  res.success({ message: 'Password set successfully', data: minUser });
};
