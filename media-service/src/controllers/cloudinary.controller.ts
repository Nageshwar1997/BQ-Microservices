import { AppError } from '@beautinique/be-classes';
import type { TMediaResource } from '@beautinique/be-constants';
import { bullQueue } from '@beautinique/be-jobs';
import type { Response } from 'express';

import { randomUUID } from 'crypto';
import { cloudinary } from '../classes';
import { logger } from '../configs';
import type { AuthRequest } from '../types';
import { generateBaseMediaPayload } from '../utils';

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const CLEANUP_DELAY = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/*                            SINGLE MEDIA UPLOAD                             */
/* -------------------------------------------------------------------------- */

export const singleMediaUploadController = async (req: AuthRequest, res: Response) => {
  const { body, file, user } = req;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  if (!file) throw new AppError({ message: 'File is required', code: 'BAD_REQUEST' });

  const { _id: userId } = user;

  const { folder, resourceType } = body as { folder: string; resourceType: TMediaResource };

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadSingle({ file, folder, resourceType });

  const payload = generateBaseMediaPayload({ ...uploadedMedia, userId });

  try {
    // Generate unique identifier
    const batchId = randomUUID();

    /* ---------------- CREATE UNUSED MEDIA ---------------- */

    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'create-single-unused-media',
      data: payload,
      options: {
        jobId: `create-single-unused-${batchId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });

    /* ---------------- CLEANUP CHECK JOB ---------------- */

    await bullQueue.addJob({
      queueName: 'media-queue',
      jobName: 'delete-single-media',
      data: { publicId: payload.publicId },
      options: {
        delay: CLEANUP_DELAY,
        jobId: `delete-single-${batchId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  } catch (error) {
    /* ---------------- ROLLBACK CLOUDINARY ---------------- */

    try {
      await cloudinary.removeSingle({ publicId: payload.publicId, resourceType });
    } catch (cleanupError) {
      logger.error(`Failed to rollback single uploaded media: ${cleanupError}`);
    }

    throw error;
  }

  res.success(200, 'File uploaded successfully', { url: uploadedMedia.secure_url });
};

/* -------------------------------------------------------------------------- */
/*                           MULTIPLE MEDIA UPLOAD                            */
/* -------------------------------------------------------------------------- */

export const multipleMediaUploadController = async (req: AuthRequest, res: Response) => {
  const { body, files: multerFiles, user } = req;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  if (!multerFiles) throw new AppError({ message: 'Files are required', code: 'BAD_REQUEST' });

  const files = multerFiles as Express.Multer.File[];

  const { _id: userId } = user;

  const { folder, resourceType } = body as { folder: string; resourceType: TMediaResource };

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadMultiple({ files, folder, resourceType });

  const payload = uploadedMedia.map((media) => generateBaseMediaPayload({ ...media, userId }));

  const publicIds = payload.map(({ publicId }) => publicId);

  try {
    /* ---------------- CREATE UNUSED MEDIA ---------------- */
    // Generate unique identifier
    const batchId = randomUUID();

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

    /* ---------------- CLEANUP CHECK JOB ---------------- */

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
      logger.error(`Failed to rollback multiple uploaded media: ${cleanupError}`);
    }

    throw error;
  }

  res.success(200, 'Files uploaded successfully', {
    urls: uploadedMedia.map(({ secure_url }) => secure_url),
  });
};
