import type {
  TCategoryZodSchema,
  TProductBasicInfoZodSchema,
  TProductDescriptionAndContentZodSchema,
  TProductMediaAndGalleryZodSchema,
  TProductStatus,
  TProductVariantZodSchema,
  TSort,
  TTryOnSelection,
  TUserRole,
} from '@beautinique/backend-types';
import type { InferSchemaType, Types } from 'mongoose';

import type { categorySchema, productSchema, variantSchema } from '../schemas/index.js';
export type TId = Types.ObjectId;
export type TStrId = string;
export interface IId {
  _id: TId;
}

export interface IIdStr {
  _id: TStrId;
}

export interface ICategory extends IId, InferSchemaType<typeof categorySchema> {}

export type TCacheCategory = TCategoryZodSchema & IIdStr & Pick<ICategory, 'slug'>;

export type TCategoryHierarchy = TCacheCategory & { subcategories: TCategoryHierarchy[] };

export type TVariant = InferSchemaType<typeof variantSchema> & IId;

export type TProduct = InferSchemaType<typeof productSchema> & IId;

export type TCreateProductPayload = Omit<
  TProduct,
  | '_id'
  | 'variants'
  | 'averageRating'
  | 'createdAt'
  | 'updatedAt'
  | 'discount'
  | 'returnCount'
  | 'reviews'
  | 'totalReviews'
  | 'totalRating'
  | 'soldCount'
> & { variants: Omit<TVariant, '_id' | 'discount'>[] };

export interface IUser extends IId {
  role: TUserRole;
}

type TDisabledTryOn = { enabled: false } & Partial<TTryOnSelection>;

type TEnabledTryOn = { enabled: true } & TTryOnSelection;

export type ITryOn = (TDisabledTryOn | TEnabledTryOn) & { configured: boolean };

export interface IGenerateSku {
  data: Record<string, string>;
  prefix?: string;
  unique?: boolean;
}

interface TSearchOperatorBase<TPath extends string> {
  query: string;
  path: TPath;
  tokenOrder?: 'any' | 'sequential';
  fuzzy?: { maxEdits: number };
  score?: { boost: { value: number } };
}

export interface IAutocompleteSearchOperator<TPath extends string> {
  autocomplete: TSearchOperatorBase<TPath>;
}

export interface ITextSearchOperator<TPath extends string> {
  text: TSearchOperatorBase<TPath>;
}

export type TDashboardListProduct = Pick<
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
  | 'createdAt'
  | 'updatedAt'
> & { variants: Pick<TVariant, '_id' | 'stock'>[] };

export interface IGetDashboardProductsQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: TProductStatus;
  category?: string;
  sortBy?: keyof Pick<
    TProduct,
    'createdAt' | 'updatedAt' | 'title' | 'sellingPrice' | 'originalPrice' | 'soldCount'
  >;
  sortOrder?: TSort;
}

export type DashboardCacheProduct = Omit<TProduct, 'category' | 'variants'> & {
  category: Pick<ICategory, 'name'>;
  variants: Omit<TVariant, 'stockThreshold'>[];
};

export type TProductFilter = Pick<TProduct, 'seller' | 'status' | 'category'>;

export type TStorefrontProductSort =
  'relevance' | 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating' | 'discount';

/** The query of the public product listing, checked and with the defaults in. */
export interface IProductsListing {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock: boolean;
  /** Percent off, at least. */
  minDiscount?: number;
  tryOn: boolean;
  sort: TStorefrontProductSort;
}

/**
 * What the listing reads from a product: the fields of its card (what the card shows as it is), and what the card
 * is made from (the images, the stock, the try-on and the variants it turns into "in stock", "few left", a colour).
 */
export type TStorefrontListProduct = Omit<
  IStorefrontProduct,
  '_id' | 'hoverImage' | 'inStock' | 'lowStock' | 'hasTryOn' | 'colors' | 'colorCount'
> &
  Pick<TProduct, 'images' | 'stock' | 'stockThreshold' | 'tryOn'> & {
    variants: Pick<TVariant, 'type' | 'label' | 'value' | 'thumbnail' | 'stock'>[];
  };

/**
 * A product as the card of the storefront shows it. The title, brand, prices, short description and thumbnail are the
 * package's types of the same fields (the types of the seller's form), the id and what the product itself has (its
 * slug, discount, rating, reviews, sales, variants flag and date) are those of `TProduct`; what is declared here is what
 * the storefront adds. Nothing here is about the seller or the stock count.
 */
export interface IStorefrontProduct
  extends
    IIdStr,
    Pick<TProductBasicInfoZodSchema, 'title' | 'brand' | 'originalPrice' | 'sellingPrice'>,
    Pick<TProductDescriptionAndContentZodSchema, 'shortDescription'>,
    Pick<TProductMediaAndGalleryZodSchema, 'thumbnail'>,
    Pick<
      TProduct,
      | 'slug'
      | 'discount'
      | 'averageRating'
      | 'totalReviews'
      | 'soldCount'
      | 'hasVariants'
      | 'createdAt'
    > {
  /** The image the card shows when it is hovered, when the product has a second one. */
  hoverImage?: string;
  inStock: boolean;
  /** In stock, but only a few are left. */
  lowStock: boolean;
  hasTryOn: boolean;
  /** The colours of the product (at most {@link STOREFRONT_MAX_COLORS}); `colorCount` is how many there are. */
  colors: TStorefrontColor[];
  colorCount: number;
}

/**
 * What the page of one product reads from it: the fields it is shown with, and what they are made from (the stock of
 * the product and of each variant, which turns into "in stock" / "few left"; the category, with its name).
 */
export type TStorefrontDetailProduct = Omit<
  IStorefrontProductDetails,
  '_id' | 'inStock' | 'lowStock' | 'category' | 'variants'
> &
  Pick<TProduct, 'stock' | 'stockThreshold'> & {
    category: IId & Pick<ICategory, 'name'>;
    variants: (Omit<IStorefrontVariant, 'inStock' | 'lowStock'> &
      Pick<TVariant, 'stock' | 'stockThreshold'>)[];
  };

/**
 * One variant of a product, on the page of the product. What the package already says of a variant (its type, label,
 * value, prices and pictures) is taken from it; the rest is what the storefront adds. (The schemas of this side hold
 * links only, so there is no file to leave out as in the frontend's `OmitFile`.)
 */
export interface IStorefrontVariant
  extends
    Pick<
      TProductVariantZodSchema,
      'type' | 'label' | 'value' | 'originalPrice' | 'sellingPrice' | 'thumbnail' | 'images'
    >,
    Pick<TVariant, 'sku' | 'discount'> {
  inStock: boolean;
  /** In stock, but only a few are left. */
  lowStock: boolean;
}

/** A colour of a product, as its card shows it: a Color variant (`value` is the colour itself, a CSS colour). */
export type TStorefrontColor = Pick<
  IStorefrontVariant,
  'label' | 'value' | 'thumbnail' | 'inStock'
>;

/**
 * A product as its own page shows it: the card's fields, the texts of the package (the description and the rest, HTML of
 * the editor), and what only the page has. Nothing here is about the seller, the review of the product (its history,
 * its status) or the stock count: the stock is only "in stock", "few left" or neither.
 */
export interface IStorefrontProductDetails
  extends
    Omit<IStorefrontProduct, 'hoverImage' | 'hasTryOn' | 'colors' | 'colorCount'>,
    Pick<
      TProductDescriptionAndContentZodSchema,
      'description' | 'instructions' | 'ingredients' | 'additional'
    >,
    Pick<TProductMediaAndGalleryZodSchema, 'images' | 'video'> {
  category: IIdStr & Pick<ICategory, 'name'>;
  tryOn: TProduct['tryOn'];
  variants: IStorefrontVariant[];
}

export interface IStorefrontBrandFacet {
  name: string;
  count: number;
}

export interface IStorefrontFilters {
  /** The brands of the matching products, with how many each has (the brand filter itself left out). */
  brands: IStorefrontBrandFacet[];
  /** The cheapest and the dearest of the matching products (the price filter itself left out). */
  price: { min: number; max: number } | null;
}

/** What the `$facet` of the public listing gives back: the page, the total and what the filters can offer. */
export interface IProductsListingFacets {
  products: (TStorefrontListProduct & IId)[];
  total: { count: number }[];
  brands: (IIdStr & { count: number })[];
  price: { min: number; max: number }[];
}
