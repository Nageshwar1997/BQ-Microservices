import { AuthenticationError, ErrorBuilder, ValidationError } from '@beautinique/backend-classes';
import {
  IMAGE_MIMES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MB,
  VIDEO_MIMES,
} from '@beautinique/shared-constants';
import type { TImageMime, TMediaResource, TVideoMime } from '@beautinique/shared-types';
import type { UploadApiResponse } from 'cloudinary';
import type { Request } from 'express';
import { Types } from 'mongoose';

import type { IMulterCustomError, TId } from '../types/index.js';

/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;
/* ========== NULL CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};

/* ========== OBJECT ID CONVERTER FUNCTION ========== */

export const toObjectId = (id: string): TId => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid ObjectId.');
  }

  return new Types.ObjectId(id);
};

export const getObjId = (id: string | TId): TId => {
  return typeof id === 'string' ? toObjectId(id) : id;
};

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

export const getCustomError = ({ files, format, size }: IMulterCustomError) => {
  const errors = new ErrorBuilder();

  // Allowed size limits
  const imageSizeLimit = size?.IMAGE ?? MAX_IMAGE_SIZE;
  const videoSizeLimit = size?.VIDEO ?? MAX_VIDEO_SIZE;
  const otherSizeLimit = size?.OTHER ?? 2 * MB;

  // Allowed MIME types
  const allowedImageTypes = format?.IMAGE ?? IMAGE_MIMES;
  const allowedVideoTypes = format?.VIDEO ?? VIDEO_MIMES;
  const allowedOtherTypes = format?.OTHER ?? [];

  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedOtherTypes]
    .map((type) => type.split('/')[1])
    .join(', ');

  for (const file of files) {
    const { originalname, fieldname, size, mimetype } = file;

    const isImage = allowedImageTypes.includes(mimetype as TImageMime);
    const isVideo = allowedVideoTypes.includes(mimetype as TVideoMime);
    const isOther = allowedOtherTypes.includes(mimetype);

    const fileSizeMB = (size / MB).toFixed(2);

    let maxSize = otherSizeLimit;
    let mediaType = 'File';

    if (isImage) {
      maxSize = imageSizeLimit;
      mediaType = 'Image';
    } else if (isVideo) {
      maxSize = videoSizeLimit;
      mediaType = 'Video';
    }

    // Unsupported type
    if (!isImage && !isVideo && !isOther) {
      errors.addField(
        fieldname,
        `File '${originalname}' has unsupported media type '${mimetype}'. Allowed: [${allowedTypes}].`,
        'UNSUPPORTED_MEDIA_TYPE',
      );

      continue;
    }

    // Size validation
    if (size > maxSize) {
      errors.addField(
        fieldname,
        `${mediaType} '${originalname}' exceeds the maximum allowed size (${(maxSize / MB).toFixed(
          2,
        )}MB). Received: ${fileSizeMB}MB.`,
        'PAYLOAD_TOO_LARGE',
      );
    }
  }

  return errors.build();
};
