import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { Product } from '../../models';
import { getUser } from '../../utils';

export const publishPendingProductController = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { _id: userId } = getUser(req);

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError({ message: 'Product not found.', code: 'NOT_FOUND' });
  }

  product.status = 'PUBLISHED';

  if (product.history) {
    product.history.approvedBy = userId;
    product.history.approvedAt = new Date();
  }

  res.success(201, 'Product published successfully');
};
