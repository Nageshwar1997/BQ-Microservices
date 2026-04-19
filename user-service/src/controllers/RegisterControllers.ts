import { cacheService, getUserService, queueService } from '@/services';
import { AppError } from '@beautinique/be-classes';
import type { TRegisterEmail } from '@beautinique/be-zod';
import type { Request, Response } from 'express';

class RegisterControllers {
  public async sendOtp(req: Request, res: Response) {
    const { email } = req.body as TRegisterEmail;
    const user = await getUserService.by_email({ email });

    if (user && user.providers.includes('MANUAL')) {
      throw new AppError({
        message: 'User already exists, please login',
        statusCode: 400,
        code: 'AUTH_ERROR',
        fieldErrors: { email: ['Email already exists'] },
      });
    }

    // Store email in cache
    const { otpToken, sendCount, otp } = await cacheService.setCacheOtpToken(email);

    await queueService.addJob({
      queueName: 'email-queue',
      jobName: 'send-otp',
      data: { email, otp },
    });

    res.success(200, 'OTP sent successfully', { data: { otpToken, sendCount } });
  }
}

export const registerControllers = new RegisterControllers();
