import type { TMediaResource } from '@beautinique/be-constants';
import type { UploadApiResponse } from 'cloudinary';
import { Types } from 'mongoose';
import type { TId } from '../types';

/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;
/* ========== NULL CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};

/* ========== OBJECT ID CONVERTER FUNCTION ========== */
export const toObjectId = (id: string): TId => new Types.ObjectId(id);

export const generateBaseMediaPayload = (data: UploadApiResponse & { userId: string | TId }) => {
  const userId = typeof data.userId === 'string' ? toObjectId(data.userId) : data.userId;
  return {
    userId,
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type as TMediaResource,
    createdAt: data.created_at,
    metadata: {
      width: data.width,
      height: data.height,
      format: data.format,
      size: data.bytes,
      folder: data.asset_folder,
    },
  };
};

export const extractUrlInfo = (url: string) => {
  const parts = url.split('/');

  const uploadIndex = parts.indexOf('upload');

  const resourceType = parts[uploadIndex - 1];

  const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');

  const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');

  return { resourceType, publicId };
};
