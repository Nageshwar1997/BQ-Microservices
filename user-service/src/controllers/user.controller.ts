import { NotFoundError } from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TUpdateUserZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../configs/index.js';
import { User } from '../models/index.js';
import { getMinimalUser } from '../utils/index.js';

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
