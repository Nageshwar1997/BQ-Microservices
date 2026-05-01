import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { logger } from '../configs';
import { STATUS_MAP } from '../constants';
import { Media } from '../models';
import type { IBaseMedia, IMedia } from '../types';

export const createUnusedSingleMediaController = async (req: Request, res: Response) => {
  const payload = req.body as IBaseMedia;
  const data = await Media.create(payload);

  if (!data) {
    throw new AppError({ message: 'Media not created', statusCode: 500, code: 'INTERNAL_ERROR' });
  }

  res.success(200, 'Media created successfully');
};

export const createUnusedMultipleMediaController = async (req: Request, res: Response) => {
  const payload = req.body as IBaseMedia[];

  const data = await Media.insertMany(payload);

  if (!data) {
    throw new AppError({ message: 'Media not created', statusCode: 500, code: 'INTERNAL_ERROR' });
  }

  res.success(200, 'Media created successfully');
};

export const markAsUsedSingleMediaController = async (req: Request, res: Response) => {
  const { publicId, relatedTo, metadata, url } = req.body as Partial<IMedia>;

  if (!publicId && !url) {
    throw new AppError({
      message: 'publicId or url is required',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const query = { ...(publicId ? { publicId } : { url }), isDeleted: false };

  const updateData: Partial<IMedia> = {
    ...(relatedTo && { relatedTo }),
    ...(metadata && { metadata }),

    status: STATUS_MAP.USED,
    isUsed: true,
    expiresAt: null,
  };

  const updated = await Media.findOneAndUpdate(query, updateData, { new: true, lean: true });

  if (!updated) {
    throw new AppError({
      message: 'Media not found or already deleted',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }
  res.success(200, 'Media updated successfully');
};

export const markAsUsedMultipleMediaController = async (req: Request, res: Response) => {
  const { data } = req.body as { data: Partial<IMedia>[] };

  if (!Array.isArray(data) || data.length === 0) {
    throw new AppError({
      message: 'Payload must be a non-empty array',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  // 🔧 build bulk operations
  const operations = data.map((item) => {
    const { publicId, url, relatedTo, metadata } = item;

    if (!publicId && !url) {
      throw new AppError({
        message: 'Each item must have publicId or url',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    }

    const filter = { ...(publicId ? { publicId } : { url }), isDeleted: false };

    const update = {
      ...(relatedTo && { relatedTo }),
      ...(metadata && { metadata }),

      status: STATUS_MAP.USED,
      isUsed: true,
      expiresAt: null,
    };

    return { updateOne: { filter, update } };
  });

  const result = await Media.bulkWrite(operations);

  logger.info('Media updated successfully', {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });

  res.success(200, 'Media updated successfully');
};

export const markAsDeletedSingleMediaController = async (req: Request, res: Response) => {
  const { publicId, url, deletedBy } = req.body as Partial<IMedia>;

  if (!publicId && !url) {
    throw new AppError({
      message: 'publicId or url is required',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const query = { ...(publicId ? { publicId } : { url }), isDeleted: false };

  const updateData: Partial<IMedia> = {
    isDeleted: true,
    status: STATUS_MAP.DELETED,
    ...(deletedBy && { deletedBy }),
  };

  const updated = await Media.findOneAndUpdate(query, updateData, { new: true, lean: true });

  if (!updated) {
    throw new AppError({
      message: 'Media not found or already deleted',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }

  logger.info('Single media deleted', { publicId: updated.publicId });

  res.success(200, 'Media deleted successfully');
};

export const markAsDeletedMultipleMediaController = async (req: Request, res: Response) => {
  const payload = req.body as Partial<IMedia>[];

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new AppError({
      message: 'Payload must be a non-empty array',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const operations = payload.map((item) => {
    const { publicId, url, deletedBy } = item;

    if (!publicId && !url) {
      throw new AppError({
        message: 'Each item must have publicId or url',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    }

    const filter = { ...(publicId ? { publicId } : { url }), isDeleted: false };

    const update = { isDeleted: true, status: STATUS_MAP.DELETED, ...(deletedBy && { deletedBy }) };

    return { updateOne: { filter, update } };
  });

  const result = await Media.bulkWrite(operations, { ordered: false });

  logger.info('Multiple media deleted', {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });

  res.success(200, 'Media deleted successfully');
};

export const getNonDeletedSingleMediaController = async (req: Request, res: Response) => {
  const { publicId } = req.query as { publicId: string };

  const data = await Media.findOne({ publicId, isDeleted: false });

  if (!data) {
    throw new AppError({
      message: 'Media not found or already deleted',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }

  res.success(200, 'Media found successfully', data);
};

export const getNonDeletedMultipleMediaController = async (req: Request, res: Response) => {
  const { publicIds } = req.query as { publicIds: string[] };

  const data = await Media.find({ publicId: { $in: publicIds }, isDeleted: false });

  if (!data) {
    throw new AppError({
      message: 'Media not found or already deleted',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }

  res.success(200, 'Media found successfully', data);
};
