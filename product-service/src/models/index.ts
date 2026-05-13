import { model } from 'mongoose';
import { categorySchema, productSchema, variantSchema } from '../schemas';
import type { TCategoryDoc, TProductDoc, TVariantDoc } from '../types';

export const Category = model<TCategoryDoc>('Category', categorySchema);
export const Product = model<TProductDoc>('Product', productSchema);
export const Variant = model<TVariantDoc>('Variant', variantSchema);
