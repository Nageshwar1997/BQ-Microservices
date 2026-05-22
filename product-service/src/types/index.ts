import type { TRole } from '@beautinique/be-constants';
import type { Document, InferSchemaType, Types } from 'mongoose';
import type { PRODUCT_STATUSES, TRY_ON_MAP } from '../constants';
import type { categorySchema, productSchema, variantSchema } from '../schemas';

export type TId = Types.ObjectId;
export interface IId {
  _id: TId;
}

export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export type TCategory = InferSchemaType<typeof categorySchema> & IId;
export type TCategoryDoc = TCategory & Document;
export type TCacheCategory = Pick<
  TCategory,
  'level' | 'parent' | 'name' | '_id' | 'slug' | 'description'
>;

export type TVariant = InferSchemaType<typeof variantSchema> & IId;
export type TVariantDoc = TVariant & Document;

export type TProduct = InferSchemaType<typeof productSchema> & IId;
export type TProductDoc = TProduct & Document;

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

export interface ILip {
  category: 'LIP';
  type: (typeof TRY_ON_MAP)['LIP'][number];
}

export interface IEye {
  category: 'EYE';
  type: (typeof TRY_ON_MAP)['EYE'][number];
}

export interface IHair {
  category: 'HAIR';
  type: (typeof TRY_ON_MAP)['HAIR'][number];
}

export interface IFace {
  category: 'FACE';
  type: (typeof TRY_ON_MAP)['FACE'][number];
}

export interface INail {
  category: 'NAIL';
  type: (typeof TRY_ON_MAP)['NAIL'][number];
}

export interface ISkin {
  category: 'SKIN';
  type: (typeof TRY_ON_MAP)['SKIN'][number];
}

export type TTryOnCategory = ILip | IEye | IHair | IFace | INail | ISkin;

export type ITryOn = { enabled: false } | ({ enabled: true } & TTryOnCategory);
