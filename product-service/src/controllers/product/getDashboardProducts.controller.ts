import type { Request, Response } from 'express';
import type { PipelineStage } from 'mongoose';
import { PRODUCT_STATUSES, PRODUCT_STATUS_MAP, ROLES_MAP, SORT_MAP } from '../../constants';
import { Product } from '../../models';
import type { ICategory, TId, TProduct, TProductSortBy, TProductStatus, TSort } from '../../types';
import { getObjId, getUser } from '../../utils';

type TProductFilter = Pick<TProduct, 'seller' | 'status' | 'category'>;

type TDashboardProduct = Pick<
  TProduct,
  | 'title'
  | 'sku'
  | 'brand'
  | 'originalPrice'
  | 'sellingPrice'
  | 'stock'
  | 'slug'
  | 'thumbnail'
  | 'returnCount'
  | 'averageRating'
  | 'status'
  | 'tryOn'
  | 'soldCount'
  | 'hasVariants'
  | 'variants'
> &
  Pick<ICategory, 'name'>;
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
    sortBy?: TProductSortBy;
    sortOrder?: TSort;
  };

  const currentPage = Math.max(Number(page), 1);
  const pageSize = Math.max(Number(limit), 1);

  const direction = sortOrder === SORT_MAP.asc ? 1 : -1;

  const sortStage: Record<string, 1 | -1> =
    sortBy === 'title'
      ? { title: direction }
      : sortBy === 'updatedAt'
        ? { updatedAt: direction }
        : { createdAt: direction };

  const statusMatch: Partial<Pick<TProduct, 'seller'>> = {};

  if (user.role === ROLES_MAP.SELLER) {
    statusMatch.seller = user._id;
  }

  const searchFilters: { equals: { path: keyof TProductFilter; value: TId | TProductStatus } }[] =
    [];

  if (user.role === ROLES_MAP.SELLER) {
    searchFilters.push({ equals: { path: 'seller', value: user._id } });
  }

  if (status) {
    searchFilters.push({ equals: { path: 'status', value: status } });
  }

  if (category) {
    searchFilters.push({ equals: { path: 'category', value: getObjId(category) } });
  }

  const matchStage: Partial<TProductFilter> = {};

  if (user.role === ROLES_MAP.SELLER) {
    matchStage.seller = user._id;
  }

  if (status) {
    matchStage.status = status;
  }

  if (category) {
    matchStage.category = getObjId(category);
  }

  const pipeline: PipelineStage[] = [];

  if (search?.trim()) {
    pipeline.push({
      $search: {
        index: 'dashboard-products',
        compound: {
          must: [
            {
              autocomplete: {
                query: search.trim(),
                path: 'title',
                fuzzy: { maxEdits: 1, prefixLength: 2 },
              },
            },
          ],
          ...(searchFilters.length > 0 && { filter: searchFilters }),
        },
      },
    });
  } else {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $facet: {
      products: [
        { $sort: sortStage },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category',
            pipeline: [{ $project: { _id: 0, name: 1 } }],
          },
        },
        {
          $unwind: { path: '$category', preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
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
            category: 1,
          },
        },
        { $skip: (currentPage - 1) * pageSize },
        { $limit: pageSize },
      ],
      total: [{ $count: 'count' }],
    },
  });

  const [productsResult, statusCounts] = await Promise.all([
    Product.aggregate<{ products: TDashboardProduct[]; total: { count: number }[] }>(pipeline),

    Product.aggregate<{ _id: TProductStatus; count: number }>([
      { $match: statusMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const products: TDashboardProduct[] = productsResult[0]?.products ?? [];

  const totalCount = productsResult[0]?.total?.[0]?.count ?? 0;

  const counts: Record<TProductStatus | 'ALL', number> = [...PRODUCT_STATUSES, 'ALL'].reduce<
    Record<TProductStatus | 'ALL', number>
  >(
    (acc, status) => {
      acc[status as TProductStatus | 'ALL'] = 0;
      return acc;
    },
    {} as Record<TProductStatus | 'ALL', number>,
  );

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

  res.success(200, 'Products fetched successfully', {
    data: {
      products,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      counts,
    },
  });
};
