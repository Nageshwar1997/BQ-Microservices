import { googleAuth } from '@/apis';
import { cacheService, getUserService, setUserService } from '@/services';
import { authUtils } from '@/utils';
import { AppError } from '@beautinique/be-classes';
import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';

export const manualLoginController = async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body ?? {};
  const user = await getUserService.by_email_or_phone({ email, phoneNumber });

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

  // Compare password
  const isPasswordMatch = bcrypt.compareSync(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError({
      message: 'Login Failed',
      statusCode: 401,
      code: 'AUTH_ERROR',
      fieldErrors: { password: ['Wrong password'] },
    });
  }

  const token = authUtils.generateJwtToken(user._id);

  const { password: _password, ...restUser } = user;

  await cacheService.setCachedUser(user);

  res.success(200, 'User logged in successfully', { token, user: restUser });
};

export const googleRedirectController = async (_req: Request, res: Response) => {
  const url = googleAuth.url();
  res.success(200, 'User logged in successfully', { url });
};

export const googleCallbackController = async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) throw new AppError({ message: 'No code returned from Google', statusCode: 400 });

  // Fetch user info from Google
  const profile = await googleAuth.decode(String(code));
  if (!profile) throw new AppError({ message: 'User info not found', statusCode: 404 });

  // Check if user already exists (email = primary identity)
  let user = await getUserService.by_email({ email: profile.email, lean: false });

  if (user) {
    // If GOOGLE not linked yet, link it
    if (!user.providers.includes('GOOGLE')) {
      user.providers.push('GOOGLE');
      await user.save();
    }
  } else {
    // Prepare payload
    const payload = await authUtils.createOAuthDbPayload(profile, 'GOOGLE');

    // Create new user
    user = await setUserService.create(payload);
  }

  await cacheService.setCachedUser(user);

  const token = authUtils.generateJwtToken(user._id);

  res.success(200, 'User logged in successfully', { token });
};
