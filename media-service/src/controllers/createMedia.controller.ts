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
