import { googleAuthClient } from '@/clients';
import { User } from '@/models';
import { getUserByEmailOrPhoneNumber, redisService } from '@/services';
import { createOAuthDbPayload, generateAuthToken } from '@/utils';
import { AppError } from '@beautinique/be-classes';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';

export const manualLoginController = async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body ?? {};

  const user = await getUserByEmailOrPhoneNumber({ email, phoneNumber });

  if (!user.providers.includes('MANUAL')) {
    // Check if user has MANUAL login
    throw new AppError({
      message: `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
      code: 'AUTH_ERROR',
      statusCode: 401,
    });
  }

  if (!user.password) {
    throw new AppError({
      message: 'No password set for this account. Please set a password to login manually.',
      statusCode: 400,
    });
  }

  // Compare password
  const isPasswordMatch = bcrypt.compareSync(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError({
      message: 'Login Failed',
      statusCode: 400,
      code: 'AUTH_ERROR',
      fieldErrors: { password: ['Wrong password'] },
    });
  }

  const token = generateAuthToken(user._id);

  const { password: _password, ...restUser } = user;

  await redisService.setCachedUser(user);

  res.success(200, 'User logged in successfully', { token, user: restUser });
};

export const googleRedirectController = (_req: Request, res: Response) => {
  const url = googleAuthClient.url;
  res.success(200, 'User logged in successfully', { url });
};

export const googleCallbackController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;

    if (!code)
      throw new AppError({
        message: 'No code returned from Google',
        statusCode: 400,
      });

    // Fetch user info from Google
    const profile = await googleAuthClient.decode(code);
    if (!profile) throw new AppError({ message: 'User info not found', statusCode: 400 });

    // Prepare payload
    const payload = await createOAuthDbPayload(profile, 'GOOGLE');

    // Check if user already exists (email = primary identity)
    let user = await User.findOne({ email: payload.email });

    if (user) {
      // If GOOGLE not linked yet, link it
      if (!user.providers.includes('GOOGLE')) {
        user.providers.push('GOOGLE');
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create(payload);
    }

    const token = generateAuthToken(user._id);

    await redisService.setCachedUser(user);
    res.success(200, 'User logged in successfully', { token });
  } catch (err) {
    next(err);
  }
};
