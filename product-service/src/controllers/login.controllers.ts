import { AppError } from '@beautinique/be-classes';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { githubAuth, googleAuth, linkedinAuth, redisCache } from '../classes';
import { createNewUser, getUserByEmail, getUserByEmailOrPhone } from '../services';
import { createOAuthDbPayload, getMinimalUser } from '../utils';

export const manualLoginController = async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body ?? {};
  const user = await getUserByEmailOrPhone({ email, phoneNumber });

  if (!user.providers.includes('MANUAL')) {
    // Check if user has MANUAL login
    throw new AppError({
      message: `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  // Compare password
  const isPasswordMatch = bcrypt.compareSync(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError({
      message: 'Login Failed',
      code: 'VALIDATION_ERROR',
      fieldErrors: { password: ['Incorrect password'] },
    });
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success(200, 'User logged in successfully', { user: minUser });
};

export const googleRedirectController = async (_req: Request, res: Response) => {
  const url = googleAuth.url();
  res.success(200, "Google's login page", { url });
};

export const googleCallbackController = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    throw new AppError({ message: 'No code returned from Google', code: 'BAD_REQUEST' });
  }

  // Fetch user info from Google
  const profile = await googleAuth.decode(String(code));

  if (!profile) {
    throw new AppError({ message: 'User info not found', code: 'NOT_FOUND' });
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('GOOGLE') && 'save' in user) {
      user.providers.push('GOOGLE');
      if (!user.avatar) {
        user.avatar = profile.picture || '';
      }
      await user.save();
    }
  } else {
    // Prepare payload
    const payload = await createOAuthDbPayload(profile, 'GOOGLE');

    // Create new user
    user = await createNewUser(payload);
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success(200, 'User logged in successfully', { user: minUser });
};

export const linkedinRedirectController = async (_req: Request, res: Response) => {
  const url = linkedinAuth.url();
  res.success(200, 'LinkedIn login page', { url });
};

export const linkedinCallbackController = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    throw new AppError({ message: 'No code returned from LinkedIn', code: 'BAD_REQUEST' });
  }

  // Fetch user info from Google
  const { access_token } = await linkedinAuth.access_token(String(code));

  const profile = await linkedinAuth.decode(access_token);

  if (!profile) {
    throw new AppError({ message: 'User info not found', code: 'NOT_FOUND' });
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('LINKEDIN') && 'save' in user) {
      user.providers.push('LINKEDIN');
      if (!user.avatar) {
        user.avatar = profile.picture || '';
      }
      await user.save();
    }
  } else {
    // Prepare payload
    const payload = await createOAuthDbPayload(profile, 'LINKEDIN');

    // Create new user
    user = await createNewUser(payload);
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success(200, 'User logged in successfully', { user: minUser });
};

export const githubRedirectController = async (_req: Request, res: Response) => {
  const url = githubAuth.url();
  res.success(200, 'GitHub login page', { url });
};

export const githubCallbackController = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    throw new AppError({ message: 'No code returned from GitHub', code: 'BAD_REQUEST' });
  }

  // Fetch user info from Google
  const { access_token } = await githubAuth.access_token(String(code));
  const profile = await githubAuth.decode(access_token);

  if (!profile) {
    throw new AppError({ message: 'User info not found', code: 'NOT_FOUND' });
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('GITHUB') && 'save' in user) {
      user.providers.push('GITHUB');
      if (!user.avatar) {
        user.avatar = profile.avatar_url || '';
      }
      await user.save();
    }
  } else {
    // Prepare payload
    const payload = await createOAuthDbPayload(profile, 'GITHUB');

    // Create new user
    user = await createNewUser(payload);
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success(200, 'User logged in successfully', { user: minUser });
};
