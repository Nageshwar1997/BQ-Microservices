import { NotFoundError } from '@beautinique/backend-classes';
import { PRODUCT_STATUSES_MAP } from '@beautinique/shared-constants';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';
import { Product } from '../../models/index.js';
import type { DashboardCacheProduct } from '../../types/index.js';

export const getDashboardProductBySlugController = async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };

  let product = await redisCacheManager.dashboard.getProductBySlug(slug);;

  if (!product) {
    const dbProduct = await Product.findOne({ slug, status: PRODUCT_STATUSES_MAP.PUBLISHED })
      .select('-variants.stockThreshold')
      .populate('category', 'name -_id')
      .lean<DashboardCacheProduct>()
      .exec();

    if (!dbProduct) {
      throw new NotFoundError('Product not found');
    }

    product = dbProduct;

    res.locals.afterFinish?.push(() =>
      redisCacheManager.dashboard.setProductBySlug(slug, dbProduct),
    );;
  }

  res.success({ message: 'Product fetched successfully', data: product });
};
