import type { TRole } from '@beautinique/be-constants';
import type { TCategory } from '@beautinique/be-zod';
import type { InferSchemaType, Types } from 'mongoose';
import type { PRODUCT_STATUSES, TRY_ON_MAP } from '../constants';
import type { categorySchema, productSchema, variantSchema } from '../schemas';

export type TId = Types.ObjectId;
export type TStrId = string;
export interface IId {
  _id: TId;
}

export interface IIdStr {
  _id: TStrId;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory extends IId, InferSchemaType<typeof categorySchema> {}

export type TCacheCategory = TCategory & IIdStr & Pick<ICategory, 'slug'>;

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
  | 'saleCount'
> & { variants: Omit<TVariant, '_id' | 'discount'>[] };

export interface IUser extends IId {
  role: TRole;
}

export type TProductStatus = (typeof PRODUCT_STATUSES)[number];

export type TTryOn = typeof TRY_ON_MAP;
export type TTryOnKey = keyof TTryOn;

export type TTryOnCategoryMap = {
  [K in TTryOnKey]: { category: K; subCategory: TTryOn[K][number] };
}[TTryOnKey];

type TTryOnDisabled =
  | { enabled: false }
  | ({ enabled: false; configured: boolean } & TTryOnCategoryMap);

type TTryOnEnabled = { enabled: true; configured: boolean } & TTryOnCategoryMap;

export type ITryOn = TTryOnDisabled | TTryOnEnabled;

export interface IGenerateSku {
  data: Record<string, string>;
  prefix?: string;
  unique?: boolean;
}
