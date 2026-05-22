import { model } from 'mongoose';
import { categorySchema, productSchema, variantSchema } from '../schemas';
import type { ICategoryDoc, TProductDoc, TVariantDoc } from '../types';

export const Category = model<ICategoryDoc>('Category', categorySchema);
export const Product = model<TProductDoc>('Product', productSchema);
export const Variant = model<TVariantDoc>('Variant', variantSchema);
