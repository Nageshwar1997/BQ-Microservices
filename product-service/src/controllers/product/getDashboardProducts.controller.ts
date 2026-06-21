import type { Request, Response } from 'express';
import type { PipelineStage } from 'mongoose';
import {
  PRODUCT_DASHBOARD_PROJECTION,
  ROLES_MAP,
  SORT_MAP,
  type TProductFilter,
} from '../../constants';
import { Product } from '../../models';
import type {
  IGetDashboardProductsQuery,
  TDashboardProduct,
  TId,
  TProduct,
  TProductStatus,
} from '../../types';
import {
  getInitialProductCountsByStatus,
  getObjId,
  getUser,
  populateProductCountsByStatus,
} from '../../utils';

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
  } = req.query as IGetDashboardProductsQuery;

  const currentPage = Math.max(Number(page), 1);
  const pageSize = Math.max(Number(limit), 1);

  const direction = sortOrder === SORT_MAP.asc ? 1 : -1;

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

  let products: TDashboardProduct[];
  let totalCount: number;

  let counts = getInitialProductCountsByStatus();

  const sortStage = { [sortBy]: direction } as const;

  const statusCountsPromise = Product.aggregate<{ _id: TProductStatus; count: number }>([
    { $match: statusMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  if (search?.trim()) {
    const pipeline: PipelineStage[] = [
      {
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
      },

      {
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
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            { $project: PRODUCT_DASHBOARD_PROJECTION },
            { $skip: (currentPage - 1) * pageSize },
            { $limit: pageSize },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [productsResult, statusCounts] = await Promise.all([
      Product.aggregate<{ products: TDashboardProduct[]; total: { count: number }[] }>(pipeline),
      statusCountsPromise,
    ]);

    products = productsResult[0]?.products ?? [];
    totalCount = productsResult[0]?.total?.[0]?.count ?? 0;

    counts = populateProductCountsByStatus(counts, statusCounts);
  } else {
    const [productDocs, total, statusCounts] = await Promise.all([
      Product.find(matchStage)
        .populate('category', 'name -_id')
        .select(PRODUCT_DASHBOARD_PROJECTION)
        .sort(sortStage)
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean<TDashboardProduct[]>(),

      Product.countDocuments(matchStage),

      statusCountsPromise,
    ]);

    products = productDocs;
    totalCount = total;

    counts = populateProductCountsByStatus(counts, statusCounts);
  }

  res.success(200, 'Products fetched successfully', {
    data: {
      products: products ?? [],
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
