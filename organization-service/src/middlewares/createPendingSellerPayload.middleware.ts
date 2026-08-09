import { NotFoundError } from '@beautinique/backend-classes';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';

import { redisCacheManager } from '../configs/index.js';

/**
 * Reassembles the seller onboarding wizard's draft (saved step-by-step via
 * `saveDraftSellerController`) from redis and replaces `req.body` with it,
 * so `createSellerController` (and the `sellerDraftDetailsZodSchema`
 * validation right after this) work off the full, real draft - not
 * whatever the client happened to send. Mirrors product-service's
 * `createPendingProductPayload`.
 */
export const createPendingSellerPayload = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const user = getUser(req.user);
  const draft = await redisCacheManager.seller.getDraftSeller(user._id.toString());

  if (!draft) {
    throw new NotFoundError('Draft expired');
  }

  req.body = draft;

  next();
};
