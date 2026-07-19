import type {
  TCategoryZodSchema,
  TProductBasicInfoZodSchema,
  TProductDescriptionAndContentZodSchema,
  TProductMediaAndGallerySchema,
  TProductStatus,
  TProductStockAndVariantsSchema,
  TProductTryOnConfigurationZodSchema,
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

export type TDraftProductStepBody =
  | TProductBasicInfoZodSchema
  | TProductMediaAndGallerySchema
  | TProductDescriptionAndContentZodSchema
  | TProductStockAndVariantsSchema
  | TProductTryOnConfigurationZodSchema;

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
  | 'variants'
  | 'createdAt'
  | 'updatedAt'
>;

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
