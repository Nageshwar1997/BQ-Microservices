import type { Request, Response } from 'express';

import { PRODUCT_STATUS_MAP } from '../../constants/index.js';
import { Product } from '../../models/index.js';

export const getProductBySlugController = async (req: Request, res: Response) => {
  const slug = req.params.slug as string;

  const product = await Product.findOne({ slug, status: PRODUCT_STATUS_MAP.PUBLISHED })
    .populate('category', 'name -_id')
    .lean()
    .exec();

  res.success(200, 'Product fetched successfully', { product });
};
