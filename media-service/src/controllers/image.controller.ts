import { bullQueue, cloudinary } from '@/classes';
import type { TService } from '@/types';
import { generateBaseMediaPayload } from '@/utils';
import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';

export const singleImageUploadController = async (req: Request, res: Response) => {
  const file = req.file;
  const { folder, service } = req.body as { folder: string; service: TService };

  if (!file) {
    throw new AppError({ message: 'No file uploaded', statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const response = await cloudinary.uploadSingle({ file, folder, resourceType: 'image' });

  await bullQueue.addJob({
    queueName: 'media-queue',
    jobName: 'create-single-media',
    data: generateBaseMediaPayload(response, service),
  });

  res.success(200, 'Image uploaded successfully', { data: response.secure_url });
};

export const multipleImageUploadController = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { folder, service } = req.body;

  const response = await cloudinary.uploadMultiple({ files, folder, resourceType: 'image' });

  await bullQueue.addJob({
    queueName: 'media-queue',
    jobName: 'create-multiple-media',
    data: response.map((res) => generateBaseMediaPayload(res, service)),
  });

  res.success(200, 'Images uploaded successfully', { data: response.map((res) => res.secure_url) });
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
