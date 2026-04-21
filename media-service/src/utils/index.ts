import { envs } from '@/envs';
import type { TId } from '@/types';
import { Types } from 'mongoose';

export const toObjectId = (id: string): TId => new Types.ObjectId(id);

export const generateFolderName = (folder?: string) => {
  const sanitize = (str: string) => str.replace(/[&|/\\#?%]/g, '_');

  const baseFolder = sanitize((folder || 'common_folder').split(' ').join('_'));

  const { getDate, getMonth, getFullYear } = new Date();

  const year = getFullYear();
  const month = String(getMonth() + 1).padStart(2, '0');
  const day = String(getDate()).padStart(2, '0');

  return `${envs.cloudinary.main_folder}/${baseFolder}/${year}/${month}/${day}`;
};
