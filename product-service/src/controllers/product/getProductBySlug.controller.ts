import { NotFoundError } from '@beautinique/backend-classes';
import { PRODUCT_STATUSES_MAP } from '@beautinique/backend-constants';
import type { Request, Response } from 'express';

import { PRODUCT_DETAILS_SELECT } from '../../constants/index.js';
import { Product } from '../../models/index.js';
import type { IId, TStorefrontDetailProduct } from '../../types/index.js';
import { toStorefrontProductDetails } from '../../utils/index.js';

/**
 * The public page of one product: a published product only (anything else - a draft, one waiting for review, a
 * blocked one - is "not found", as if it did not exist), as the storefront shows it. The dashboard has its own
 * lookup (`getDashboardProductBySlugController`) that returns more, behind a role.
 */
export const getProductBySlugController = async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };

  const product = await Product.findOne({ slug, status: PRODUCT_STATUSES_MAP.PUBLISHED })
    .select(PRODUCT_DETAILS_SELECT)
    .populate('category', 'name')
    .lean<(TStorefrontDetailProduct & IId) | null>()
    .exec();

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.success({
    message: 'Product fetched successfully',
    data: toStorefrontProductDetails(product),
  });
};
