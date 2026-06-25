import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { redisCache } from '../../classes';
import { PRODUCT_STATUS_MAP } from '../../constants';
import { Product } from '../../models';
import type { DashboardCacheProduct } from '../../types';

export const getDashboardProductBySlugController = async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };

  let product = await redisCache.dashboard.getProductBySlug(slug);

  if (!product) {
    const dbProduct = await Product.findOne({ slug, status: PRODUCT_STATUS_MAP.PUBLISHED })
      .select('-variants.stockThreshold')
      .populate('category', 'name -_id')
      .lean<DashboardCacheProduct>()
      .exec();

    if (!dbProduct) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Product not found' });
    }

    product = dbProduct;

    res.locals.afterFinish?.push(() => redisCache.dashboard.setProductBySlug(slug, dbProduct));
  }

  return res.success(200, 'Product fetched successfully', { product });
};
