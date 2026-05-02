import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { bullQueue, cloudinary } from '../classes';
import type { TResourceType } from '../types';
import { generateBaseMediaPayload } from '../utils';

export const singleMediaUploadController = async (req: Request, res: Response) => {
  const file = req.file;
  const { folder, resourceType } = req.body as { folder: string; resourceType: TResourceType };

  if (!file) throw new AppError({ message: 'File is required', code: 'BAD_REQUEST' });

  const response = await cloudinary.uploadSingle({ file, folder, resourceType });

  const payload = generateBaseMediaPayload(response);

  await Promise.all([
    // 1️⃣ Save as unused
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'mark-as-unused-single-media',
      data: payload,
    }),

    // 2️⃣ ⏱️ Delay delete check (after 1 hour)
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'single-media-remove-if-unused',
      data: payload,
      options: { delay: 60 * 60 * 1000 },
    }),
  ]);

  res.success(200, 'Media uploaded successfully', { data: response.secure_url });
};

export const multipleMediaUploadController = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const body = req.body as { folder: string; resourceType: TResourceType };

  const response = await cloudinary.uploadMultiple({ files, ...body });

  const payload = response.map((res) => generateBaseMediaPayload(res));

  await Promise.all([
    // 1️⃣ Save as unused
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'mark-as-unused-multiple-media',
      data: payload,
    }),

    // 2️⃣ ⏱️ Delay delete check (after 1 hour)
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'multiple-media-remove-if-unused',
      data: payload,
      options: { delay: 60 * 60 * 1000 },
    }),
  ]);

  res.success(200, 'Media uploaded successfully', { data: response.map((res) => res.secure_url) });
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
