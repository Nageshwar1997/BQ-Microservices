import { envs } from '@/envs';
import type { TId, TUser } from '@/types';
import { AppError } from '@beautinique/be-classes';
import type { TAuthProvider } from '@beautinique/be-constants';
// import axios from 'axios';
import { sign } from 'jsonwebtoken';

class AuthUtils {
  private getSocialAuthAvatar = async (url: string) => {
    if (!url) return '';
    // const { headers, data } = await axios.get(url, { responseType: 'arraybuffer' });
    // const file = {
    //   buffer: Buffer.from(data),
    //   mimetype: headers['content-type'],
    //   originalname: 'profile-pic.jpg',
    // };
    //   const cldResp = await MediaModule.Utils.singleImageUploader({
    //     file,
    //     cloudinaryConfigOption: 'image',
    //     folder: 'Profile_Pictures',
    //   });

    //   return cldResp?.secure_url || url;
    return url;
  };
  public async createOAuthDbPayload(
    data: Record<string, string>,
    provider: TAuthProvider,
  ): Promise<TUser> {
    const fullName = data.name?.trim() || '';
    const nameParts = fullName.split(/\s+/);

    const firstName = data.given_name || nameParts[0];
    const lastName =
      data.family_name || (nameParts.length > 1 ? nameParts?.slice(1)?.join(' ') : '') || '';

    const avatar = await this.getSocialAuthAvatar(data.picture || data.avatar_url);

    return {
      email: data.email,
      firstName,
      lastName,
      avatar,
      password: '',
      phoneNumber: '',
      providers: [provider],
      role: 'USER',
      status: 'ACTIVE',
    };
  }

  public generateJwtToken(userId: string | TId) {
    const token = sign({ userId }, envs.jwt_secret, { expiresIn: '1d' });

    if (!token) {
      throw new AppError({ message: 'Failed to generate token', statusCode: 500 });
    }

    return token;
  }
}

export const authUtils = new AuthUtils();
