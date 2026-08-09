import type { TFolderZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';

import { cloudinary } from '../classes/index.js';
import { jobProducer, logger } from '../configs/index.js';
import { CLEANUP_DELAY } from '../constants/index.js';
import type { TFile } from '../types/index.js';
import { generateBaseMediaPayload } from '../utils/index.js';

export const singleMediaUploadController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const {
    body: { folder },
    file,
  } = req as { file: TFile; body: TFolderZodSchema };

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadSingle({ file, folder });

  const payload = generateBaseMediaPayload({ ...uploadedMedia, userId });

  /* ---------------- ROLLBACK CLOUDINARY (if anything below fails) ---------------- */

  res.locals.afterRollback?.push(async () => {
    try {
      await cloudinary.removeSingle({ publicId: payload.publicId });
    } catch (cleanupError) {
      logger.error({ Error: cleanupError }, 'Failed to rollback uploaded single media.');
    }
  });

  /* ---------------- CREATE UNUSED MEDIA ---------------- */

  await jobProducer.addJob(
    'media-service-queue',
    'create-single-unused-media',
    { ...payload, userId: userId.toString() },
    {
      jobId: `create-single-unused-${payload.publicId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  /* ---------------- AUTO CLEANUP SCHEDULER ---------------- */

  await jobProducer.addJob(
    'media-service-queue',
    'delete-single-media',
    { publicId: payload.publicId },
    {
      delay: CLEANUP_DELAY,
      jobId: `delete-single-${payload.publicId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  res.success({
    statusCode: 201,
    message: 'File uploaded successfully',
    data: uploadedMedia.secure_url,
  });
};

export const multipleMediaUploadController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const {
    body: { folder },
    files,
  } = req as { files: TFile[]; body: TFolderZodSchema };

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadedMedia = await cloudinary.uploadMultiple({ files, folder });

  const payload = uploadedMedia.map((media) => ({
    ...generateBaseMediaPayload({ ...media, userId }),
    userId: userId.toString(),
  }));

  const publicIds = payload.map(({ publicId }) => publicId);

  /* ---------------- DETERMINISTIC BATCH ID ---------------- */

  const batchId = createHash('md5').update(publicIds.sort().join('-')).digest('hex').slice(0, 12);

  /* ---------------- ROLLBACK CLOUDINARY (if anything below fails) ---------------- */

  res.locals.afterRollback?.push(async () => {
    try {
      await cloudinary.removeMultiple({ publicIds });
    } catch (cleanupError) {
      logger.error({ Error: cleanupError }, 'Failed to rollback uploaded multiple media.');
    }
  });

  /* ---------------- CREATE UNUSED MEDIA ---------------- */

  await jobProducer.addJob('media-service-queue', 'create-multiple-unused-media', payload, {
    jobId: `create-multiple-unused-${batchId}`,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  });

  /* ---------------- AUTO CLEANUP SCHEDULER ---------------- */

  await jobProducer.addJob(
    'media-service-queue',
    'delete-multiple-media',
    { publicIds },
    {
      delay: CLEANUP_DELAY,
      jobId: `delete-multiple-${batchId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  res.success({
    statusCode: 201,
    message: 'Files uploaded successfully',
    data: uploadedMedia.map(({ secure_url }) => secure_url),
  });
};
