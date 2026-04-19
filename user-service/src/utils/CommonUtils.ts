import type { TId } from '@/types';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';

class CommonUtils {
  public generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
  public generateTempToken(bytes = 32) {
    return randomBytes(bytes).toString('hex');
  }

  public toObjectId = (id: string): TId => new Types.ObjectId(id);
}

export const commonUtils = new CommonUtils();
