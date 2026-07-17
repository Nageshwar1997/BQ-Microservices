import { NotFoundError, PreconditionFailedError } from '@beautinique/backend-classes';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';

import { redisCache } from '../classes/index.js';
import type { TDraftProduct } from '../controllers/index.js';

export const createPendingProductPayload = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const user = getUser(req.user);
  const draft = await redisCache.dashboard.getDraftProduct(user._id.toString());

  if (!draft) {
    throw new NotFoundError('Draft expired');
  }

  if (!draft.basicInfo) {
    throw new PreconditionFailedError('Basic info is missing');
  }

  if (!draft.descriptionAndContent) {
    throw new PreconditionFailedError('Description and content is missing');
  }

  if (!draft.stockAndVariants) {
    throw new PreconditionFailedError('Stock and variants configuration is missing');
  }

  if (!draft.mediaAndGallery) {
    throw new PreconditionFailedError('Product media is missing');
  }

  if (!draft.tryOnConfiguration) {
    throw new PreconditionFailedError('Try-on configuration is missing');
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
