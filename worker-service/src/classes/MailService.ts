import { envs } from '@/envs';
import { ApiRequest } from './ApiRequest';
import type { TSendOtpMail } from '@beautinique/be-zod';

export class MailService extends ApiRequest {
  constructor() {
    super(
      `${envs.is_dev ? envs.url.service.mail.dev : envs.url.service.mail.prod}/mail-service/api/v1`,
    );
  }

  public async sendOtp(data: TSendOtpMail) {
    await this.request({ ...this.routes.mail.sendOtp, data });
  }
}
