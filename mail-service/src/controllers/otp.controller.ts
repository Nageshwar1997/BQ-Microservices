import type { TEmailOtp } from '@beautinique/be-zod';
import type { Request, Response } from 'express';
import { transporter } from '../classes';
import { logger } from '../configs';

export const sendOtpController = async (req: Request, res: Response) => {
  const { email, otp } = req.body as TEmailOtp;
  logger.info('Inside Otp Controller');

  await transporter.sendOtp(email, otp);
  res.success(200, 'OTP sent successfully');
};
