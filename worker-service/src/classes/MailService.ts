import { envs } from '@/envs';
import { ApiRequest } from './ApiRequest';

export class MailService extends ApiRequest {
  constructor() {
    super(
      `${envs.is_dev ? envs.url.service.mail.dev : envs.url.service.mail.prod}/mail-service/api/v1`,
    );
  }

  public async sendOtp(data: { email: string; otp: string }) {
    await this.request({ ...this.routes.mail.sendOtp, data });
  }
}
