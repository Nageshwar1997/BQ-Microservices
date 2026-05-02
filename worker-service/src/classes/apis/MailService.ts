import type { TEmailOtp } from '@beautinique/be-zod';
import { envs } from '../../envs';
import { ApiRequest } from './ApiRequest';

class MailService extends ApiRequest {
  constructor() {
    super(`${envs.url.service.mail}/api/v1`);
  }

  public async sendOtp(data: TEmailOtp) {
    await this.request({ ...this.routes.mail.sendOtp, data });
  }
}

export const mailService = new MailService();
