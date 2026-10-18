import { PRODUCT_STATUSES_MAP, REGEX } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { PipelineStage } from 'mongoose';

import {
  PRODUCT_STOREFRONT_PROJECTION,
  STOREFRONT_MAX_BRANDS,
  STOREFRONT_MAX_COLORS,
  STOREFRONT_PRODUCT_SORT_STAGES,
  STOREFRONT_PRODUCT_SORTS,
  STOREFRONT_PRODUCTS_LIMIT,
  STOREFRONT_SEARCH_MAX_LENGTH,
} from '../constants/index.js';
import type {
  IId,
  IProductsListing,
  IProductsListingFacets,
  IStorefrontFilters,
  IStorefrontProduct,
  IStorefrontProductDetails,
  TCacheCategory,
  TStorefrontDetailProduct,
  TStorefrontListProduct,
  TStorefrontProductSort,
} from '../types/index.js';

/** The first value of a query parameter (Express hands a repeated one over as a list). */
const one = (value: unknown): string | undefined => {
  const first: unknown = Array.isArray(value) ? value[0] : value;

  return typeof first === 'string' ? first : undefined;
};

const all = (value: unknown): string[] => {
  const list: unknown[] = Array.isArray(value) ? value : [value];

  return list.filter((item): item is string => typeof item === 'string');
};

const toInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const toAmount = (value: string | undefined) => {
  if (!value?.trim()) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const nonEmpty = (value: string | undefined) => (value?.length ? value : undefined);

const isOn = (value: string | undefined) => value === 'true' || value === '1';

const isSort = (value: string | undefined): value is TStorefrontProductSort =>
  STOREFRONT_PRODUCT_SORTS.some((sort) => sort === value);

/**
 * Checks the query of the public listing and puts the defaults in. Nothing here throws: a value that is
 * not usable is left out (the page is a public one, a link with a stale filter should still open).
 */
export const parseProductsListing = (query: Record<string, unknown>): IProductsListing => {
  const search = one(query.search)?.trim().slice(0, STOREFRONT_SEARCH_MAX_LENGTH);
  const category = one(query.category)?.trim();

  const brands = [...new Set(all(query.brand).map((brand) => brand.trim()))]
    .filter(Boolean)
    .slice(0, STOREFRONT_MAX_BRANDS);

  let minPrice = toAmount(one(query.minPrice));
  let maxPrice = toAmount(one(query.maxPrice));

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const rating = toAmount(one(query.minRating));
  const discount = toAmount(one(query.minDiscount));
  const requestedSort = one(query.sort);
  const sort: TStorefrontProductSort = isSort(requestedSort)
    ? requestedSort
    : search
      ? 'relevance'
      : 'newest';

  return {
    page: Math.min(Math.max(toInteger(one(query.page), 1), 1), 1000),
    limit: Math.min(
      Math.max(toInteger(one(query.limit), STOREFRONT_PRODUCTS_LIMIT.default), 1),
      STOREFRONT_PRODUCTS_LIMIT.max,
    ),
    search: nonEmpty(search),
    category: nonEmpty(category),
    brands,
    minPrice,
    maxPrice,
    minRating: rating ? Math.min(rating, 5) : undefined,
    inStock: isOn(one(query.inStock)),
    minDiscount: discount ? Math.min(discount, 100) : undefined,
    tryOn: isOn(one(query.tryOn)),
    // `relevance` is the order of a search - without one there is nothing to be relevant to
    sort: sort === 'relevance' && !search ? 'newest' : sort,
  };
};

/**
 * The ids of a category and of every category under it. Products hold their deepest category, so the
 * listing of a main or a sub category is the listing of all the final categories below it.
 * Empty when there is no such category.
 */
export const getCategoryBranchIds = (categories: TCacheCategory[], categoryId: string) => {
  if (!REGEX.MONGODB_ID.test(categoryId)) return [];

  const root = categories.find((category) => category._id === categoryId);

  if (!root) return [];

  const children = new Map<string, string[]>();

  for (const category of categories) {
    if ('parent' in category) {
      children.set(category.parent, [...(children.get(category.parent) ?? []), category._id]);
    }
  }

  const ids = [root._id];

  for (const id of ids) ids.push(...(children.get(id) ?? []));

  return ids;
};

/**
 * The pipeline of the public listing: the published products (of the categories, matching the search),
 * and in one `$facet` the page, the total, and what the filters can offer.
 *
 * The brands and the price range are counted with every filter *except their own* - choosing a brand
 * must not make the other brands disappear from the list, nor a price range its own limits.
 */
export const getProductsListingPipeline = (
  listing: IProductsListing,
  categoryIds?: string[],
): PipelineStage[] => {
  const { page, limit, search, brands, minPrice, maxPrice, minRating, minDiscount, sort } = listing;

  const base: Record<string, unknown> = { status: PRODUCT_STATUSES_MAP.PUBLISHED };

  if (categoryIds) base.category = { $in: categoryIds.map((id) => getObjId(id)) };

  const filters = (omit?: 'brand' | 'price') => {
    const match: Record<string, unknown> = {};

    if (brands.length > 0 && omit !== 'brand') match.brand = { $in: brands };

    if ((minPrice !== undefined || maxPrice !== undefined) && omit !== 'price') {
      match.sellingPrice = {
        ...(minPrice !== undefined && { $gte: minPrice }),
        ...(maxPrice !== undefined && { $lte: maxPrice }),
      };
    }

    if (minRating) match.averageRating = { $gte: minRating };

    if (minDiscount) match.discount = { $gte: minDiscount };

    if (listing.tryOn) match['tryOn.enabled'] = true;

    if (listing.inStock) {
      match.$or = [
        { hasVariants: false, stock: { $gt: 0 } },
        { hasVariants: true, 'variants.stock': { $gt: 0 } },
      ];
    }

    return { $match: match };
  };

  const searchStages: PipelineStage[] = search
    ? [
        {
          $search: {
            index: 'product-search',
            compound: {
              should: [
                {
                  autocomplete: {
                    query: search,
                    path: 'title',
                    fuzzy: { maxEdits: 1, prefixLength: 2 },
                    score: { boost: { value: 10 } },
                  },
                },
                { autocomplete: { query: search, path: 'brand', score: { boost: { value: 5 } } } },
                { text: { query: search, path: 'shortDescription', fuzzy: { maxEdits: 1 } } },
              ],
              minimumShouldMatch: 1,
            },
          },
        },
        { $addFields: { _score: { $meta: 'searchScore' } } },
      ]
    : [];

  const order =
    sort === 'relevance'
      ? ({ _score: -1, _id: -1 } as const)
      : STOREFRONT_PRODUCT_SORT_STAGES[sort];

  return [
    ...searchStages,
    { $match: base },
    {
      $facet: {
        products: [
          filters(),
          { $sort: order },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: PRODUCT_STOREFRONT_PROJECTION },
        ],
        total: [filters(), { $count: 'count' }],
        brands: [
          filters('brand'),
          { $group: { _id: '$brand', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        price: [
          filters('price'),
          { $group: { _id: null, min: { $min: '$sellingPrice' }, max: { $max: '$sellingPrice' } } },
        ],
      },
    },
  ];
};

export const toStorefrontFilters = ({
  brands,
  price,
}: Pick<IProductsListingFacets, 'brands' | 'price'>): IStorefrontFilters => {
  const range = price[0];

  return {
    brands: brands.map(({ _id, count }) => ({ name: _id, count })),
    price: range ? { min: Math.floor(range.min), max: Math.ceil(range.max) } : null,
  };
};

/** The stock of a product (or of one of its variants) in words: it has some, and only a few of them. */
const getStockState = (stock: number | null | undefined, threshold: number | null | undefined) => {
  const inStock = (stock ?? 0) > 0;

  return {
    inStock,
    lowStock: inStock && typeof threshold === 'number' && (stock ?? 0) <= threshold,
  };
};

/** A product as its card shows it: the stock turned into "in stock" / "few left", the seller left out. */
export const toStorefrontProduct = (product: TStorefrontListProduct & IId): IStorefrontProduct => {
  const { hasVariants, stock, stockThreshold, variants, thumbnail } = product;

  const colors = variants
    .filter((variant) => variant.type === 'Color')
    .map(({ label, value, thumbnail: swatch, stock: left }) => ({
      label,
      value,
      ...(swatch && { thumbnail: swatch }),
      inStock: left > 0,
    }));

  const inStock = hasVariants
    ? variants.some((variant) => variant.stock > 0)
    : getStockState(stock, stockThreshold).inStock;
  const hoverImage = product.images.find((image) => image !== thumbnail);

  return {
    _id: product._id.toString(),
    title: product.title,
    slug: product.slug,
    brand: product.brand,
    shortDescription: product.shortDescription,
    thumbnail,
    ...(hoverImage && { hoverImage }),
    originalPrice: product.originalPrice,
    sellingPrice: product.sellingPrice,
    discount: product.discount,
    averageRating: product.averageRating,
    totalReviews: product.totalReviews,
    soldCount: product.soldCount,
    inStock,
    lowStock: inStock && !hasVariants && getStockState(stock, stockThreshold).lowStock,
    hasTryOn: product.tryOn?.enabled === true,
    hasVariants,
    colors: colors.slice(0, STOREFRONT_MAX_COLORS),
    colorCount: colors.length,
    createdAt: product.createdAt,
  };
};

/**
 * A product as its own page shows it: what a customer is shown, and the stock as "in stock" / "few left" (of the
 * product, or of each variant). The seller, the history of the review, the status and the product's own sku are not
 * in it.
 */
export const toStorefrontProductDetails = (
  product: TStorefrontDetailProduct & IId,
): IStorefrontProductDetails => {
  const { hasVariants, stock, stockThreshold } = product;

  const variants = product.variants.map((variant) => ({
    sku: variant.sku,
    type: variant.type,
    label: variant.label,
    value: variant.value,
    originalPrice: variant.originalPrice,
    sellingPrice: variant.sellingPrice,
    discount: variant.discount,
    ...getStockState(variant.stock, variant.stockThreshold),
    images: variant.images,
    ...(variant.thumbnail && { thumbnail: variant.thumbnail }),
  }));

  const inStock = hasVariants
    ? variants.some((variant) => variant.inStock)
    : getStockState(stock, stockThreshold).inStock;

  return {
    _id: product._id.toString(),
    title: product.title,
    slug: product.slug,
    brand: product.brand,
    shortDescription: product.shortDescription,
    description: product.description,
    ...(product.instructions && { instructions: product.instructions }),
    ...(product.ingredients && { ingredients: product.ingredients }),
    ...(product.additional && { additional: product.additional }),
    thumbnail: product.thumbnail,
    images: product.images,
    ...(product.video && { video: product.video }),
    category: { _id: product.category._id.toString(), name: product.category.name },
    originalPrice: product.originalPrice,
    sellingPrice: product.sellingPrice,
    discount: product.discount,
    averageRating: product.averageRating,
    totalReviews: product.totalReviews,
    soldCount: product.soldCount,
    inStock,
    lowStock: inStock && !hasVariants && getStockState(stock, stockThreshold).lowStock,
    hasVariants,
    tryOn: product.tryOn,
    variants,
    createdAt: product.createdAt,
  };
};
