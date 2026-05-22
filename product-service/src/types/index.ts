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

export type TVariant = InferSchemaType<typeof variantSchema> & IId;

export type TProduct = InferSchemaType<typeof productSchema> & IId;

export type TDraftProduct = Pick<
  TProduct,
  | 'additionalDetails'
  | 'brand'
  | 'description'
  | 'howToUse'
  | 'images'
  | 'ingredients'
  | 'originalPrice'
  | 'sellingPrice'
  | 'title'
  | 'totalStock'
> & {
  step: number;
  category: Pick<TCategory, 'level' | 'parent' | 'name'>;
  variants: Pick<TVariant, 'images' | 'price' | 'stock' | 'title' | 'type'>[];
};

export interface IUser extends IId {
  role: TRole;
}

export type TProductStatus = (typeof PRODUCT_STATUSES)[number];

type TTryOn = typeof TRY_ON_MAP;
type TTryOnKey = keyof TTryOn;

type TTryOnCategoryMap = {
  [K in TTryOnKey]: { category: K; type: TTryOn[K][number] };
}[TTryOnKey];

type TTryOnDisabled = { enabled: false } | ({ enabled: false } & TTryOnCategoryMap);

type TTryOnEnabled = { enabled: true } & TTryOnCategoryMap;

export type ITryOn = TTryOnDisabled | TTryOnEnabled;
