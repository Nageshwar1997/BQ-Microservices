import { envs } from '@/envs';
import type { TId } from '@/types';
import { AppError } from '@beautinique/be-classes';
import type { TAuthProvider } from '@beautinique/be-constants';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export const generateAuthToken = (userId: TId | string): string => {
  if (!envs.jwt_secret) {
    throw new AppError({
      message: 'JWT secret not defined',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }

  const token = jwt.sign({ userId }, envs.jwt_secret, { expiresIn: '1d' });

  if (!token) {
    throw new AppError({
      message: 'Failed to generate token',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }

  return token;
};

export const getImageAsBuffer = async (url: string) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });

  return {
    buffer: Buffer.from(response.data),
    mimetype: response.headers['content-type'],
  };
};

const getProfilePic = async (url: string) => {
  if (!url) return '';
  //   const { buffer, mimetype } = await getImageAsBuffer(url);
  //   const file = {
  //     buffer,
  //     mimetype,
  //     originalname: 'profile-pic.jpg',
  //   };
  //   const cldResp = await MediaModule.Utils.singleImageUploader({
  //     file,
  //     cloudinaryConfigOption: 'image',
  //     folder: 'Profile_Pictures',
  //   });

  //   return cldResp?.secure_url || url;
  return url;
};

export const createOAuthDbPayload = async (
  data: Record<string, string>,
  provider: TAuthProvider,
) => {
  const fullName = data.name?.trim() || '';
  const nameParts = fullName.split(/\s+/);

  const firstName = data.given_name || nameParts[0];
  const lastName =
    data.family_name || (nameParts.length > 1 ? nameParts?.slice(1)?.join(' ') : '') || '';

  const profilePic = await getProfilePic(data.picture || data.avatar_url);

  return {
    email: data.email,
    firstName,
    lastName,
    profilePic,
    password: '',
    phoneNumber: '',
    providers: [provider],
    role: 'USER',
  };
};
