import { AppError } from '@beautinique/be-classes';
import type { NextFunction, Request, Response } from 'express';
import { redisCache } from '../classes';
import type { TDraftProduct } from '../controllers';
import { getUser } from '../utils';

export const createPendingProductPayload = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const user = getUser(req);
  const draft = await redisCache.getDraftProduct(user._id.toString());

  if (!draft) {
    throw new AppError({ message: 'Draft expired', code: 'NOT_FOUND' });
  }

  if (!draft.basicInfo) {
    throw new AppError({ message: 'Basic info is missing', code: 'PRECONDITION_FAILED' });
  }

  if (!draft.descriptionAndContent) {
    throw new AppError({
      message: 'Description and content is missing',
      code: 'PRECONDITION_FAILED',
    });
  }

  if (!draft.stockAndVariants) {
    throw new AppError({
      message: 'Stock and variants configuration is missing',
      code: 'PRECONDITION_FAILED',
    });
  }

  if (!draft.mediaAndGallery) {
    throw new AppError({ message: 'Product media is missing', code: 'PRECONDITION_FAILED' });
  }

  if (!draft.tryOnConfiguration) {
    throw new AppError({ message: 'Try-on configuration is missing', code: 'PRECONDITION_FAILED' });
  }

  const body: TDraftProduct = {
    basicInfo: draft.basicInfo,
    mediaAndGallery: draft.mediaAndGallery,
    descriptionAndContent: draft.descriptionAndContent,
    stockAndVariants: draft.stockAndVariants,
    tryOnConfiguration: draft.tryOnConfiguration,
  };

  req.body = body;

  next();
};
