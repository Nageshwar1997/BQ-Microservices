import { logger } from '@/configs';
import { transporter } from '@/classes';
import type { TSendOtpMail } from '@beautinique/be-zod';
import type { Request, Response } from 'express';

export const sendOtpController = async (req: Request, res: Response) => {
  const { email, otp } = req.body as TSendOtpMail;
  logger.info('Inside Otp Controller');

  await transporter.sendOtp(email, otp);
  res.success(200, 'OTP sent successfully');
};
