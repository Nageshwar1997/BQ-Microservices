import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { redisCache } from '../../classes';
import { PRODUCT_STATUS_MAP, ROLES_MAP } from '../../constants';
import { Product } from '../../models';
import type { TProductStatus } from '../../types';
import { getObjId, getUser } from '../../utils';

export const getDashboardProductsController = async (req: Request, res: Response) => {
  const user = getUser(req);

  const {
    page = '1',
    limit = '10',
    search,
    status,
    category,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query as {
    page?: string;
    limit?: string;
    search?: string;
    status?: TProductStatus;
    category?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  };

  const currentPage = Math.max(Number(page), 1);
  const pageSize = Math.max(Number(limit), 1);

  const filter: {
    status?: TProductStatus;
    category?: Types.ObjectId;
    seller?: Types.ObjectId;
    $text?: { $search: string };
  } = {};

  const statusMatch: { seller?: Types.ObjectId } = {};

  if (user.role === ROLES_MAP.SELLER) {
    filter.seller = user._id;
    statusMatch.seller = user._id;
  }

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = getObjId(category.toString());
  }

  if (search) {
    filter.$text = { $search: String(search).trim() };
  }

  const sort: Record<string, 1 | -1 | { $meta: 'textScore' }> = {};

  if (search) {
    sort.score = { $meta: 'textScore' };
  } else {
    sort[String(sortBy)] = sortOrder === 'asc' ? 1 : -1;
  }

  const [products, total, statusCounts] = await Promise.all([
    Product.find(filter, search ? { score: { $meta: 'textScore' } } : undefined)
      .populate('category', 'name -_id')
      .select(
        {
          title: 1,
          sku: 1,
          brand: 1,
          originalPrice: 1,
          sellingPrice: 1,
          stock: 1,
          slug: 1,
          thumbnail: 1,
          returnCount: 1,
          averageRating: 1,
          status: 1,
          tryOn: 1,
          soldCount: 1,
          hasVariants: 1,
          'variants.stock': 1,
        },
      )
      .sort(sort)
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Product.countDocuments(filter),

    Product.aggregate([
      { $match: statusMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const counts: Record<TProductStatus | 'ALL', number> = {
    ALL: 0,
    PENDING: 0,
    BLOCKED: 0,
    DELETED: 0,
    REJECTED: 0,
    PUBLISHED: 0,
  };

  for (const item of statusCounts) {
    counts.ALL += item.count;

    switch (item._id) {
      case PRODUCT_STATUS_MAP.PENDING:
        counts.PENDING = item.count;
        break;

      case PRODUCT_STATUS_MAP.BLOCKED:
        counts.BLOCKED = item.count;
        break;

      case PRODUCT_STATUS_MAP.DELETED:
        counts.DELETED = item.count;
        break;

      case PRODUCT_STATUS_MAP.REJECTED:
        counts.REJECTED = item.count;
        break;

      case PRODUCT_STATUS_MAP.PUBLISHED:
        counts.PUBLISHED = item.count;
        break;
    }
  }

  const draft = await redisCache.getDraftProduct(user._id.toString());

  res.success(200, 'Products fetched successfully', {
    data: {
      products,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      counts,
      draft,
    },
  });
};
