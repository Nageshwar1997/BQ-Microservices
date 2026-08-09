import { SORT_MAP, USER_ROLE_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TProductStatus } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';
import type { PipelineStage } from 'mongoose';

import { PRODUCT_DASHBOARD_PROJECTION } from '../../constants/index.js';
import { Product } from '../../models/index.js';
import type {
  IGetDashboardProductsQuery,
  TDashboardListProduct,
  TId,
  TProductFilter,
} from '../../types/index.js';
import {
  getInitialProductCountsByStatus,
  populateProductCountsByStatus,
} from '../../utils/index.js';

export const getDashboardProductsController = async (req: Request, res: Response) => {
  const user = getUser(req.user);

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

  const categoryObjId = category ? getObjId(category) : undefined;

  const statusMatch: Partial<Omit<TProductFilter, 'status'>> = {};

  if (user.role === USER_ROLE_MAP.SELLER) {
    statusMatch.seller = user._id;
  }

  if (categoryObjId) {
    statusMatch.category = categoryObjId;
  }

  const searchFilters: { equals: { path: keyof TProductFilter; value: TId | TProductStatus } }[] =
    [];

  if (user.role === USER_ROLE_MAP.SELLER) {
    searchFilters.push({ equals: { path: 'seller', value: user._id } });
  }

  if (status) {
    searchFilters.push({ equals: { path: 'status', value: status } });
  }

  if (categoryObjId) {
    searchFilters.push({ equals: { path: 'category', value: categoryObjId } });
  }

  const matchStage: Partial<TProductFilter> = {};

  if (user.role === USER_ROLE_MAP.SELLER) {
    matchStage.seller = user._id;
  }

  if (status) {
    matchStage.status = status;
  }

  if (categoryObjId) {
    matchStage.category = categoryObjId;
  }

  let products: TDashboardListProduct[];
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
            { $project: PRODUCT_DASHBOARD_PROJECTION },
            { $skip: (currentPage - 1) * pageSize },
            { $limit: pageSize },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [productsResult, statusCounts] = await Promise.all([
      Product.aggregate<{ products: TDashboardListProduct[]; total: { count: number }[] }>(
        pipeline,
      ),
      statusCountsPromise,
    ]);

    products = productsResult[0]?.products ?? [];
    totalCount = productsResult[0]?.total[0]?.count ?? 0;

    counts = populateProductCountsByStatus(counts, statusCounts);
  } else {
    const [productDocs, total, statusCounts] = await Promise.all([
      Product.find(matchStage)
        .select(PRODUCT_DASHBOARD_PROJECTION)
        .sort(sortStage)
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean<TDashboardListProduct[]>(),

      Product.countDocuments(matchStage),

      statusCountsPromise,
    ]);

    products = productDocs;
    totalCount = total;

    counts = populateProductCountsByStatus(counts, statusCounts);
  }

  res.success({
    message: 'Products fetched successfully',
    data: {
      products: products,
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
