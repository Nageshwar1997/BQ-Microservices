import {
  AuthorizationError,
  BadRequestError,
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
} from '@beautinique/backend-classes';
import type { TLoginZodSchema, TUserRole } from '@beautinique/backend-types';
import { AUTH_PROVIDER_MAP, HEADERS_MAP, USER_ROLE_MAP } from '@beautinique/shared-constants';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';

import { githubAuth, googleAuth, linkedinAuth, redisCache } from '../classes/index.js';
import { createNewUser, getUserByEmail, getUserByEmailOrPhone } from '../services/index.js';
import type { IUser } from '../types/index.js';
import { createOAuthDbPayload, getMinimalUser } from '../utils/index.js';

export const manualLoginController = async (req: Request, res: Response) => {
  const body = req.body as TLoginZodSchema;

  const condition: Partial<Pick<IUser, 'email' | 'phoneNumber'>> = {};

  if (body.loginMethod === 'email') condition.email = body.email;

  if (body.loginMethod === 'phoneNumber') condition.phoneNumber = body.phoneNumber;

  const user = await getUserByEmailOrPhone(condition);

  if (!user.providers.includes(AUTH_PROVIDER_MAP.MANUAL)) {
    // Check if user has MANUAL login
    throw new UnprocessableEntityError(
      `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
    );
  }

  const role = req.get(HEADERS_MAP.loginRole) as TUserRole | undefined;

  if (role && user.role !== role && user.role !== USER_ROLE_MAP.MASTER) {
    throw new AuthorizationError('You are not authorized to perform this action');
  }

  // Compare password
  const isPasswordMatch = await bcrypt.compare(body.password, user.password);

  if (!isPasswordMatch) {
    throw new ValidationError('Login Failed', {
      fieldErrors: { password: ['Incorrect password'] },
    });
  }

  const minUser = getMinimalUser(user);

  await redisCache.user.setUser(minUser);

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
  const profile = await googleAuth.decode(code);

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

  await redisCache.user.setUser(minUser);

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
  const { access_token } = await linkedinAuth.access_token(code);

  const profile = await linkedinAuth.decode(access_token);

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

  await redisCache.user.setUser(minUser);

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
  const { access_token } = await githubAuth.access_token(code);
  const profile = await githubAuth.decode(access_token);

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

  await redisCache.user.setUser(minUser);

  res.success({ message: 'User logged in successfully', data: minUser });
};
