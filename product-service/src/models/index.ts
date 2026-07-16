import { model } from 'mongoose';

import { categorySchema, productSchema } from '../schemas/index.js';

export const Category = model('Category', categorySchema);
export const Product = model('Product', productSchema);
