import { cloudinary } from '@/classes';
import { Media } from '@/models';
import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';

export const singleImageUploadController = async (req: Request, res: Response) => {
  const file = req.file;
  const { folder, service } = req.body;

  if (!file) {
    throw new AppError({ message: 'No file uploaded', statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const response = await cloudinary.uploadSingle({
    file,
    folder,
    resourceType: 'image',
  });

  const data = await Media.create({
    url: response.secure_url,
    publicId: response.public_id,
    resourceType: response.resource_type,
    createdAt: response.created_at,
    relatedTo: { service },
    metadata: {
      width: response.width,
      height: response.height,
      format: response.format,
      size: response.bytes,
      folder: response.asset_folder,
    },
  });

  res.success(200, 'Image uploaded successfully', { data });
};
