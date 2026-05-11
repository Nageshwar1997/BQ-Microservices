import { AppError } from '@beautinique/be-classes';
import type { TMediaResource } from '@beautinique/be-constants';
import { bullQueue } from '@beautinique/be-jobs';
import type { Response } from 'express';
import { cloudinary } from '../classes';
import type { AuthRequest } from '../types';
import { generateBaseMediaPayload } from '../utils';

export const singleMediaUploadController = async (req: AuthRequest, res: Response) => {
  const { body, file, user } = req;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  const { _id: userId } = user;

  const { folder, resourceType } = body as { folder: string; resourceType: TMediaResource };

  if (!file) throw new AppError({ message: 'File is required', code: 'BAD_REQUEST' });

  const response = await cloudinary.uploadSingle({ file, folder, resourceType });

  const payload = generateBaseMediaPayload({ ...response, userId });

  await Promise.all([
    // 1️⃣ Save as unused
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'create-unused-single-media',
      data: payload,
    }),

    // 2️⃣ ⏱️ Delay delete check (after 1 day)
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'update-deleted-single-media',
      data: { publicId: payload.publicId },
      options: { delay: 24 * 60 * 60 * 1000 },
    }),
  ]);

  res.success(200, 'File uploaded successfully', { data: response.secure_url });
};

export const multipleMediaUploadController = async (req: AuthRequest, res: Response) => {
  const { body, files: multerFiles, user } = req;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  const { _id: userId } = user;

  const { folder, resourceType } = body as { folder: string; resourceType: TMediaResource };

  if (!multerFiles) throw new AppError({ message: 'Files are required', code: 'BAD_REQUEST' });

  const files = multerFiles as Express.Multer.File[];

  const response = await cloudinary.uploadMultiple({ files, folder, resourceType });

  const payload = response.map((res) => generateBaseMediaPayload({ ...res, userId }));

  await Promise.all([
    // 1️⃣ Save as unused
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'create-unused-multiple-media',
      data: payload,
    }),

    // 2️⃣ ⏱️ Delay delete check (after 1 day)
    bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'update-deleted-multiple-media',
      data: { publicIds: payload.map(({ publicId }) => publicId) },
      options: { delay: 24 * 60 * 60 * 1000 },
    }),
  ]);

  res.success(200, 'Files uploaded successfully', { data: response.map((res) => res.secure_url) });
};
