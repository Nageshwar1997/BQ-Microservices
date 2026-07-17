import { NotFoundError } from '@beautinique/backend-classes';
import { getUser } from '@beautinique/backend-utils';
import { PRODUCT_STATUSES_MAP } from '@beautinique/shared-constants';
import type { Request, Response } from 'express';

import { Product } from '../../models/index.js';

export const publishPendingProductController = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { _id: userId } = getUser(req.user);

  const product = await Product.findById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  product.status = PRODUCT_STATUSES_MAP.PUBLISHED;

  if (product.history) {
    product.history.approvedBy = userId;
    product.history.approvedAt = new Date();
  }

  res.success({ statusCode: 201, message: 'Product published successfully' });
};
