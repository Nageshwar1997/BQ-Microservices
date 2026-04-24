import { STATUS_MAP } from '@/constants';
import { Media } from '@/models';
import type { IBaseMedia } from '@/types';
import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';

export const createSingleMediaController = async (req: Request, res: Response) => {
  const payload = req.body as IBaseMedia;
  const data = await Media.create(payload);

  if (!data) {
    throw new AppError({ message: 'Media not created', statusCode: 500, code: 'INTERNAL_ERROR' });
  }

  res.success(200, 'Media created successfully');
};

export const createMultipleMediaController = async (req: Request, res: Response) => {
  const payload = req.body as IBaseMedia[];

  const data = await Media.insertMany(payload);

  if (!data) {
    throw new AppError({ message: 'Media not created', statusCode: 500, code: 'INTERNAL_ERROR' });
  }

  res.success(200, 'Media created successfully');
};

export const markAsUsedController = async (req: Request, res: Response) => {
  const { publicId, relatedTo } = req.body as Pick<IBaseMedia, 'publicId' | 'relatedTo'>;

  if (!publicId) {
    throw new AppError({
      message: 'publicId is required',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  }

  const updated = await Media.findOneAndUpdate(
    { publicId, status: STATUS_MAP.PENDING, isDeleted: false },
    {
      $set: {
        status: STATUS_MAP.USED,
        isUsed: true,
        expiresAt: null,
        ...(relatedTo && { relatedTo }),
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new AppError({
      message: 'Media not found or already used/deleted',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }

  res.success(200, 'Media marked as used', { data: updated });
};
