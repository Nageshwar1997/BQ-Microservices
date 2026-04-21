import { envs } from '@/envs';
import type { IPublicIdOptions, TId } from '@/types';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';

export const toObjectId = (id: string): TId => new Types.ObjectId(id);

export const generateFolderName = (folder?: string) => {
  const sanitize = (str: string) => str.replace(/[&|/\\#?%]/g, '_');

  const subfolder = sanitize((folder || 'common_folder').split(' ').join('_'));

  return `${envs.cloudinary.main_folder}/${subfolder}`;
};

export const generatePublicId = ({ entity, accountKey }: IPublicIdOptions): string => {
  const { getDate, getFullYear, getMonth } = new Date();

  const year = getFullYear();
  const month = String(getMonth() + 1).padStart(2, '0');
  const day = String(getDate()).padStart(2, '0');

  const uuid = randomUUID();

  return `${accountKey}/${entity}/${year}/${month}/${day}/${uuid}`;
};
