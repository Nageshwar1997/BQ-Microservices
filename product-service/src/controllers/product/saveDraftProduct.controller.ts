import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';
import type { TDraftProductStepBody } from '../../types/index.js';

export const saveDraftProductController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);
  const body = req.body as TDraftProductStepBody;

  const draft = await redisCacheManager.dashboard.saveDraftProductStep(userId.toString(), body);

  res.success({ statusCode: 201, message: 'Product details saved in draft', data: draft });
};
