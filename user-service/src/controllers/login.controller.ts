import {
  AuthorizationError,
  BadRequestError,
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
} from '@beautinique/backend-classes';
import type { TRole } from '@beautinique/be-constants';
import type { TLogin } from '@beautinique/be-zod';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';

import { githubAuth, googleAuth, linkedinAuth, redisCache } from '../classes/index.js';
import { HEADERS_KEYS } from '../constants/index.js';
import { createNewUser, getUserByEmail, getUserByEmailOrPhone } from '../services/index.js';
import { createOAuthDbPayload, getMinimalUser } from '../utils/index.js';

export const manualLoginController = async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body as TLogin;
  const user = await getUserByEmailOrPhone({ email, phoneNumber });

  if (!user.providers.includes('MANUAL')) {
    // Check if user has MANUAL login
    throw new UnprocessableEntityError(
      `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
    );
  }

  const role = req.get(HEADERS_KEYS.loginRole) as TRole | undefined;

  if (role && user.role !== role && user.role !== 'MASTER') {
    throw new AuthorizationError('You are not authorized to perform this action');
  }

  // Compare password
  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw new ValidationError('Login Failed', { fieldErrors: { password: ['Incorrect password'] } });
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success({ message: 'User logged in successfully', data: minUser });
};

// eslint-disable-next-line @typescript-eslint/require-await
export const googleRedirectController = async (_req: Request, res: Response) => {
  const url = googleAuth.url();
  res.success({ message: "Google's login page", data: url });
};

export const googleCallbackController = async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    throw new BadRequestError('No code returned from Google');
  }

  // Fetch user info from Google
  const profile = (await googleAuth.decode(code)) as Record<string, string> | undefined;

  if (!profile?.email) {
    throw new NotFoundError('User info not found');
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('GOOGLE') && 'save' in user) {
      user.providers.push('GOOGLE');
      if (!user.avatar) {
        user.avatar = profile.picture ?? '';
      }
      await user.save();
    }
  } else {
    // Prepare payload
    const payload = createOAuthDbPayload(profile, 'GOOGLE');

    // Create new user
    user = await createNewUser({ ...payload });
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success({ message: 'User logged in successfully', data: minUser });
};

// eslint-disable-next-line @typescript-eslint/require-await
export const linkedinRedirectController = async (_req: Request, res: Response) => {
  const url = linkedinAuth.url();
  res.success({ message: 'LinkedIn login page', data: url });
};

export const linkedinCallbackController = async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    throw new BadRequestError('No code returned from LinkedIn');
  }

  // Fetch user info from Google
  const { access_token } = (await linkedinAuth.access_token(code)) as {
    access_token: string;
  };

  const profile = (await linkedinAuth.decode(access_token)) as Record<string, string> | undefined;

  if (!profile?.email) {
    throw new NotFoundError('User info not found');
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('LINKEDIN') && 'save' in user) {
      user.providers.push('LINKEDIN');
      if (!user.avatar) {
        user.avatar = profile.picture ?? '';
      }
      await user.save();
    }
  } else {
    // Prepare payload
    const payload = createOAuthDbPayload(profile, 'LINKEDIN');

    // Create new user
    user = await createNewUser(payload);
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success({ message: 'User logged in successfully', data: minUser });
};

// eslint-disable-next-line @typescript-eslint/require-await
export const githubRedirectController = async (_req: Request, res: Response) => {
  const url = githubAuth.url();
  res.success({ message: 'GitHub login page', data: url });
};

export const githubCallbackController = async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    throw new BadRequestError('No code returned from GitHub');
  }

  // Fetch user info from Google
  const { access_token } = (await githubAuth.access_token(code)) as {
    access_token: string;
  };
  const profile = (await githubAuth.decode(access_token)) as Record<string, string> | undefined;

  if (!profile?.email) {
    throw new NotFoundError('User info not found');
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('GITHUB') && 'save' in user) {
      user.providers.push('GITHUB');
      if (!user.avatar) {
        user.avatar = profile.avatar_url ?? '';
      }
      await user.save();
    }
  } else {
    // Prepare payload
    const payload = createOAuthDbPayload(profile, 'GITHUB');

    // Create new user
    user = await createNewUser(payload);
  }

  const minUser = getMinimalUser(user);

  await redisCache.setUser(minUser);

  res.success({ message: 'User logged in successfully', data: minUser });
};
