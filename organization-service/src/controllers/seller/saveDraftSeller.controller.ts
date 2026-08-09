import type { TDraftSellerStepBodyZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';

export const saveDraftSellerController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);
  const body = req.body as TDraftSellerStepBodyZodSchema;

  const draft = await redisCacheManager.seller.saveDraftSellerStep(userId.toString(), body);

  res.success({ statusCode: 201, message: 'Seller application draft saved', data: draft });
};
