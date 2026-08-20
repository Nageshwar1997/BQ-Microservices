import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { Seller } from '../../models/index.js';

/**
 * Self-service read - lets the applicant (any `USER`, not just already-a-SELLER)
 * check their own submitted application's status (PENDING/APPROVED/REJECTED)
 * without needing admin/queue access. `data: null` (not a 404) when they
 * haven't applied yet - that's the expected/common case for a plain `USER`,
 * not an error (mirrors `getDraftSellerController`'s same null-is-fine shape).
 */
export const getMySellerController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req.user);

  const seller = await Seller.findOne({ user: userId }).lean();

  res.success({ message: 'Your seller application fetched successfully', data: seller });
};
