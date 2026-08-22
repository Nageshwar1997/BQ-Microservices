import { AuthorizationError } from '@beautinique/backend-classes';
import { PRODUCT_STATUSES_MAP, USER_ROLE_MAP } from '@beautinique/backend-constants';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { Product } from '../../models/index.js';

const VALID_STATUSES = [
  PRODUCT_STATUSES_MAP.PENDING,
  PRODUCT_STATUSES_MAP.PUBLISHED,
  PRODUCT_STATUSES_MAP.REJECTED,
] as const;
const VALID_FILTERS = ['mine', 'all', 'unassigned'] as const;

/**
 * Mirrors organization-service's `getSellerQueueController` shape
 * (`?status=` default PENDING, `?filter=mine|all|unassigned` default
 * `mine`, `all`/`unassigned` MASTER-only) - deliberately thinner than it
 * though: no `SUPER_ADMIN`-pool or `ON_LEAVE`-backup coverage, `mine` is
 * just an exact `assignedAdminId` match (see the scope-cut note on
 * `authorizeProductOwnership.middleware.ts`, Phase 5.2 - same reasoning
 * applies here).
 */
export const getProductQueueController = async (req: Request, res: Response) => {
  const requester = getUser(req.user);
  const { status, filter } = req.query as { status?: string; filter?: string };

  const productStatus = VALID_STATUSES.includes(status as never)
    ? (status as (typeof VALID_STATUSES)[number])
    : PRODUCT_STATUSES_MAP.PENDING;

  const requestedFilter = VALID_FILTERS.includes(filter as never)
    ? (filter as (typeof VALID_FILTERS)[number])
    : 'mine';

  if (requestedFilter !== 'mine' && requester.role !== USER_ROLE_MAP.MASTER) {
    throw new AuthorizationError(`Only ${USER_ROLE_MAP.MASTER} can use filter=${requestedFilter}`);
  }

  const query: Record<string, unknown> = { status: productStatus };

  if (requestedFilter === 'unassigned') {
    query.assignedAdminId = null;
  } else if (requestedFilter === 'mine') {
    query.assignedAdminId = requester._id;
  }
  // requestedFilter === 'all' -> no extra constraint beyond `status`.

  const products = await Product.find(query).sort({ createdAt: -1 }).lean();

  res.success({ message: 'Product queue fetched successfully', data: products });
};
