import { PRODUCT_STATUSES_MAP } from '@beautinique/shared-constants';
import type { Request, Response } from 'express';

import { Product } from '../../models/index.js';

export const getProductBySlugController = async (req: Request, res: Response) => {
  const slug = req.params.slug as string;

  const product = await Product.findOne({ slug, status: PRODUCT_STATUSES_MAP.PUBLISHED })
    .populate('category', 'name -_id')
    .lean()
    .exec();

  res.success({ message: 'Product fetched successfully', data: product });
};
