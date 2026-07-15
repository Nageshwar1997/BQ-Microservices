import { ValidationError } from '@beautinique/backend-classes';
import type { TEmailZodSchema, TOtpZodSchema } from '@beautinique/backend-types';

import { generateOtp, generateTempToken } from '../../utils/index.js';
import { RedisHelper } from './RedisHelper.js';

interface IOtpData extends TOtpZodSchema, TEmailZodSchema {
  sendCount: number;
}

const OTP_CACHE_TTL_SECONDS = 60 * 10; // 10 minutes
const OTP_TOKEN_BYTES = 20;

export class RedisToken extends RedisHelper {
  private readonly TOKENS_KEY = 'bq:user-service:tokens';

  private getTokenKey(token: string) {
    return `${this.TOKENS_KEY}:${token}`;
  }

  public async setOtpData(email: string) {
    const otp = generateOtp();
    const token = generateTempToken(OTP_TOKEN_BYTES);

    const data: IOtpData = { otp, email, sendCount: 1 };

    await this.setData(this.getTokenKey(token), OTP_CACHE_TTL_SECONDS, data);

    return { token, ...data };
  }

  public async getOtpData(token: string) {
    return await this.getData<IOtpData>(this.getTokenKey(token));
  }

  public async updateOtpData(token: string) {
    const prevData = await this.getOtpData(token);

    if (!prevData) {
      throw new ValidationError('OTP session expired or invalid');
    }

    const updated: IOtpData = {
      ...prevData,
      sendCount: prevData.sendCount + 1,
      otp: generateOtp(),
    };

    await this.setData(this.getTokenKey(token), OTP_CACHE_TTL_SECONDS, updated);

    return updated;
  }

  public async deleteOtpData(token: string) {
    await this.deleteData(this.getTokenKey(token));
  }
}
