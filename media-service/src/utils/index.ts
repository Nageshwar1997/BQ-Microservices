import { AuthenticationError } from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TMediaResource } from '@beautinique/shared-types';
import type { UploadApiResponse } from 'cloudinary';
import type { Request } from 'express';

/* ========== GET AUTH USER ========== */
export const getUser = (req: Request) => {
  const user = req.user;

  if (!user) throw new AuthenticationError('You are not logged in');

  return user;
};

export const generateBaseMediaPayload = (data: UploadApiResponse & { userId: string }) => {
  const userId = getObjId(data.userId);
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
      folder: (data.asset_folder ?? '') as string,
    },
  };
};
