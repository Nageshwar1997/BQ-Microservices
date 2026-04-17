import { TRegisterEmail } from '@beautinique/be-zod';
import { Request, Response } from 'express';

class RegisterControllers {
  public async sendOtp(req: Request, res: Response) {
    const body = req.body as TRegisterEmail;
    res.success(200, 'OTP sent successfully', { data: body });
  }
}

export const registerControllers = new RegisterControllers();
