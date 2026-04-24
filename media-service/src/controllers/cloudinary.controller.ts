import { bullQueue, cloudinary } from '@/classes';
import type { TResourceType } from '@/types';
import { generateBaseMediaPayload } from '@/utils';
import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';

export const singleMediaUploadController = async (req: Request, res: Response) => {
  const file = req.file;
  const { folder, resourceType } = req.body as { folder: string; resourceType: TResourceType };

  if (!file) {
    throw new AppError({
      message: 'No file uploaded',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const response = await cloudinary.uploadSingle({ file, folder, resourceType });

  await bullQueue.addJob({
    queueName: 'media-queue',
    jobName: 'mark-as-unused-single-media',
    data: generateBaseMediaPayload(response),
  });

  res.success(200, 'Media uploaded successfully');
};

export const multipleMediaUploadController = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const body = req.body as { folder: string; resourceType: TResourceType };

  const response = await cloudinary.uploadMultiple({ files, ...body });

  await bullQueue.addJob({
    queueName: 'media-queue',
    jobName: 'mark-as-unused-multiple-media',
    data: response.map((res) => generateBaseMediaPayload(res)),
  });

  res.success(200, 'Media uploaded successfully');
};

export const singleMediaRemoveController = async (req: Request, res: Response) => {
  const body = req.body as { publicId: string; resourceType: TResourceType };

  await cloudinary.removeSingle(body);

  res.success(200, 'Image removed successfully');
};

export const multipleMediaRemoveController = async (req: Request, res: Response) => {
  const body = req.body as {
    publicIds: string[];
    retryCount?: number;
    resourceType: TResourceType;
  };

  await cloudinary.removeMultiple(body);

  res.success(200, 'Image removed successfully');
};
