import { bullQueue } from '@beautinique/be-jobs';
import type { TMediaUpload } from '@beautinique/be-zod';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';

import { cloudinary } from '../classes/index.js';
import { logger } from '../configs/index.js';
import { CLEANUP_DELAY } from '../constants/index.js';
import type { TFile } from '../types/index.js';
import { generateBaseMediaPayload, getUser } from '../utils/index.js';

export const singleMediaUploadController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req);

  const {
    body: { folder },
    file,
  } = req as { file: TFile; body: TMediaUpload };

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadSingle({ file, folder });

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
      await cloudinary.removeSingle({ publicId: payload.publicId });
    } catch (cleanupError) {
      logger.error('Failed to rollback uploaded single media', cleanupError);
    }

    throw error;
  }

  res.success(200, 'File uploaded successfully', { url: uploadedMedia.secure_url });
};

export const multipleMediaUploadController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req);

  const {
    body: { folder },
    files,
  } = req as { files: TFile[]; body: TMediaUpload };

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadMultiple({ files, folder });

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
      await cloudinary.removeMultiple({ publicIds });
    } catch (cleanupError) {
      logger.error('Failed to rollback uploaded multiple media', cleanupError);
    }

    throw error;
  }

  res.success(200, 'Files uploaded successfully', {
    urls: uploadedMedia.map(({ secure_url }) => secure_url),
  });
};
