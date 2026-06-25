import type { Request, Response } from 'express';
import { PRODUCT_STATUS_MAP } from '../../constants';
import { Product } from '../../models';

export const getProductBySlugController = async (req: Request, res: Response) => {
  const slug = req.params.slug as string;

  const product = await Product.findOne({ slug, status: PRODUCT_STATUS_MAP.PUBLISHED })
    .populate('category', 'name -_id')
    .lean()
    .exec();

  return res.success(200, 'Product fetched successfully', { product });
};
