import type { TMediaResource } from '@beautinique/shared-types';
import type { UploadApiResponse } from 'cloudinary';
import type { TId } from '../types/index.js';

export const generateBaseMediaPayload = (data: UploadApiResponse & { userId: TId }) => {
  return {
    userId: data.userId,
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type as TMediaResource,
    createdAt: data.created_at,
    metadata: {
      width: data.width,
      height: data.height,
      format: data.format,
      size: data.bytes,
      ...(data.asset_folder && { folder: data.asset_folder }),
    },
  };
};
