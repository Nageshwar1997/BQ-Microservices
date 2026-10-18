import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';
import { Product } from '../../models/index.js';
import type { IProductsListingFacets } from '../../types/index.js';
import {
  getCategoryBranchIds,
  getProductsListingPipeline,
  parseProductsListing,
  toStorefrontFilters,
  toStorefrontProduct,
} from '../../utils/index.js';

/**
 * The public product listing of the storefront: published products only, one page at a time, with the
 * filters the page can offer (brands, price range). The query is checked by `parseProductsListing` - a
 * value that is not usable is left out, not an error.
 */
export const getProductsController = async (req: Request, res: Response) => {
  const listing = parseProductsListing(req.query);

  const categoryIds = listing.category
    ? getCategoryBranchIds(await redisCacheManager.category.getAllCategories(), listing.category)
    : undefined;

  // A category that does not exist has no products - and must not turn into "all of them"
  const pipeline =
    categoryIds?.length === 0 ? undefined : getProductsListingPipeline(listing, categoryIds);

  const [result] = pipeline
    ? await Product.aggregate<IProductsListingFacets>(pipeline)
    : [undefined];

  const total = result?.total[0]?.count ?? 0;

  res.success({
    message: 'Products fetched successfully',
    data: {
      products: (result?.products ?? []).map(toStorefrontProduct),
      pagination: {
        page: listing.page,
        limit: listing.limit,
        total,
        totalPages: Math.ceil(total / listing.limit),
      },
      filters: toStorefrontFilters({ brands: result?.brands ?? [], price: result?.price ?? [] }),
    },
  });
};
