import { mailService } from '@/services';
import type { TSendOtpMail } from '@beautinique/be-zod';
import type { Request, Response } from 'express';

export const otpController = async (req: Request, res: Response) => {
  const { email, otp } = req.body as TSendOtpMail;
  await mailService.sendOtp(email, otp);
  res.success(200, 'OTP sent successfully');
};
