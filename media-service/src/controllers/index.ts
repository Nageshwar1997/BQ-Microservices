import { AppError } from '@beautinique/be-classes';
import { bullQueue } from '@beautinique/be-jobs';
import type { TMediaUpload } from '@beautinique/be-zod';
import { createHash } from 'crypto';
import type { Response } from 'express';
import { cloudinary } from '../classes';
import { logger } from '../configs';
import type { AuthRequest } from '../types';
import { generateBaseMediaPayload } from '../utils';

const CLEANUP_DELAY = 24 * 60 * 60 * 1000;

export const singleMediaUploadController = async (req: AuthRequest, res: Response) => {
  const { body, file, user } = req;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  if (!file) throw new AppError({ message: 'File is required', code: 'BAD_REQUEST' });

  const { _id: userId } = user;

  const { folder, resourceType } = body as TMediaUpload;

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadSingle({ file, folder, resourceType });

  const payload = generateBaseMediaPayload({ ...uploadedMedia, userId });

  try {
    /* ---------------- CREATE UNUSED MEDIA ---------------- */

    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'create-single-unused-media',
      data: payload,
      options: {
        jobId: `create-single-unused-${payload.publicId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });

    /* ---------------- AUTO CLEANUP SCHEDULER ---------------- */

    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'delete-single-media',
      data: { publicId: payload.publicId },
      options: {
        delay: CLEANUP_DELAY,
        jobId: `delete-single-${payload.publicId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  } catch (error) {
    /* ---------------- ROLLBACK CLOUDINARY ---------------- */

    try {
      await cloudinary.removeSingle({ publicId: payload.publicId, resourceType });
    } catch (cleanupError) {
      logger.error('Failed to rollback uploaded single media', cleanupError);
    }

    throw error;
  }

  res.success(200, 'File uploaded successfully', { url: uploadedMedia.secure_url });
};

export const multipleMediaUploadController = async (req: AuthRequest, res: Response) => {
  const { body, files: multerFiles, user } = req;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  if (!multerFiles) throw new AppError({ message: 'Files are required', code: 'BAD_REQUEST' });

  const files = multerFiles as Express.Multer.File[];

  const { _id: userId } = user;

  const { folder, resourceType } = body as TMediaUpload;

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadMultiple({ files, folder, resourceType });

  const payload = uploadedMedia.map((media) => generateBaseMediaPayload({ ...media, userId }));

  const publicIds = payload.map(({ publicId }) => publicId);

  /* ---------------- DETERMINISTIC BATCH ID ---------------- */

  const batchId = createHash('md5').update(publicIds.sort().join('-')).digest('hex').slice(0, 12);

  try {
    /* ---------------- CREATE UNUSED MEDIA ---------------- */

    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'create-multiple-unused-media',
      data: payload,
      options: {
        jobId: `create-multiple-unused-${batchId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });

    /* ---------------- AUTO CLEANUP SCHEDULER ---------------- */

    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'delete-multiple-media',
      data: { publicIds },
      options: {
        delay: CLEANUP_DELAY,
        jobId: `delete-multiple-${batchId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  } catch (error) {
    /* ---------------- ROLLBACK CLOUDINARY ---------------- */

    try {
      await cloudinary.removeMultiple({ publicIds, resourceType });
    } catch (cleanupError) {
      logger.error('Failed to rollback uploaded multiple media', cleanupError);
    }

    throw error;
  }

  return res.success(200, 'Files uploaded successfully', {
    urls: uploadedMedia.map(({ secure_url }) => secure_url),
  });
};
