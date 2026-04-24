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

  const response = await cloudinary.uploadSingle({ file, folder, resourceType: 'image' });

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

  res.success(200, 'Image uploaded successfully', { data: { url: data.url } });
};

export const multipleImageUploadController = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { folder, service } = req.body;

  const response = await cloudinary.uploadMultiple({ files, folder, resourceType: 'image' });

  const data = await Promise.allSettled(
    response.map((res) => {
      return Media.create({
        url: res.secure_url,
        publicId: res.public_id,
        resourceType: res.resource_type,
        createdAt: res.created_at,
        relatedTo: { service },
        metadata: {
          width: res.width,
          height: res.height,
          format: res.format,
          size: res.bytes,
          folder: res.asset_folder,
        },
      });
    }),
  );

  res.success(200, 'Images uploaded successfully', {
    data: data.map((res) => (res.status === 'fulfilled' ? { url: res.value.url } : null)),
  });
};

export const singleImageRemoveController = async (req: Request, res: Response) => {
  const { publicId } = req.body as { publicId: string };

  await cloudinary.removeSingle({ publicId, resourceType: 'image' });

  res.success(200, 'Image removed successfully');
};

export const multipleImageRemoveController = async (req: Request, res: Response) => {
  const { publicIds, retryCount } = req.body as { publicIds: string[]; retryCount?: number };

  await cloudinary.removeMultiple({ publicIds, resourceType: 'image', retryCount });

  res.success(200, 'Image removed successfully');
};
