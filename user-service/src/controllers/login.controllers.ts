import { githubAuth, googleAuth, linkedinAuth, redisCache } from '@/classes';
import { createNewUser, getUserByEmail, getUserByEmailOrPhone } from '@/services';
import { createOAuthDbPayload, generateJwtToken } from '@/utils';
import { AppError } from '@beautinique/be-classes';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';

export const manualLoginController = async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body ?? {};
  const user = await getUserByEmailOrPhone({ email, phoneNumber });

  if (!user.providers.includes('MANUAL')) {
    // Check if user has MANUAL login
    throw new AppError({
      message: `This account was created using an oAuth (${user.providers.join(
        ' / ',
      )}) login. Please login using your provider (e.g., ${user.providers.join(', ')}).`,
      code: 'AUTH_ERROR',
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

  const token = generateJwtToken(user._id);

  const { password: _password, ...restUser } = user;

  await redisCache.setUser(user);

  res.success(200, 'User logged in successfully', { data: { token, user: restUser } });
};

export const googleRedirectController = async (_req: Request, res: Response) => {
  const url = googleAuth.url();
  res.success(200, "Google's login page", { data: url });
};

export const googleCallbackController = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    throw new AppError({
      message: 'No code returned from Google',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  }

  // Fetch user info from Google
  const profile = await googleAuth.decode(String(code));

  if (!profile) {
    throw new AppError({ message: 'User info not found', code: 'NOT_FOUND', statusCode: 404 });
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('GOOGLE')) {
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

  await redisCache.setUser(user);

  const token = generateJwtToken(user._id);

  res.success(200, 'User logged in successfully', { data: token });
};

export const linkedinRedirectController = async (_req: Request, res: Response) => {
  const url = linkedinAuth.url();
  res.success(200, 'LinkedIn login page', { data: url });
};

export const linkedinCallbackController = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    throw new AppError({
      message: 'No code returned from LinkedIn',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  }

  // Fetch user info from Google
  const { access_token } = await linkedinAuth.access_token(String(code));

  const profile = await linkedinAuth.decode(access_token);

  if (!profile) {
    throw new AppError({ message: 'User info not found', code: 'NOT_FOUND', statusCode: 404 });
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('LINKEDIN')) {
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

  await redisCache.setUser(user);

  const token = generateJwtToken(user._id);

  res.success(200, 'User logged in successfully', { data: token });
};

export const githubRedirectController = async (_req: Request, res: Response) => {
  const url = githubAuth.url();
  res.success(200, 'GitHub login page', { data: url });
};

export const githubCallbackController = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    throw new AppError({
      message: 'No code returned from GitHub',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  }

  // Fetch user info from Google
  const { access_token } = await githubAuth.access_token(String(code));
  const profile = await githubAuth.decode(access_token);

  if (!profile) {
    throw new AppError({ message: 'User info not found', code: 'NOT_FOUND', statusCode: 404 });
  }

  // Check if user already exists (email = primary identity)
  let user = await getUserByEmail({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('GITHUB')) {
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

  await redisCache.setUser(user);

  const token = generateJwtToken(user._id);

  res.success(200, 'User logged in successfully', { data: token });
};
