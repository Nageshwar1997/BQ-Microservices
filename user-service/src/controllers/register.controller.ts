import { queueService } from '@/services';
import type { TRegisterEmail } from '@beautinique/be-zod';
import type { Request, Response } from 'express';

class RegisterControllers {
  public async sendOtp(req: Request, res: Response) {
    const { email } = req.body as TRegisterEmail;
    const job = await queueService.addJob({
      queueName: 'email-queue',
      jobName: 'send-otp',
      data: { email, otp: '123456' },
    });
    res.success(200, 'OTP sent successfully', { job });
  }
}

export const registerControllers = new RegisterControllers();
