import { model, Schema } from 'mongoose';
import { CATEGORY_LEVELS } from '../constants';
import type { TCategoryDoc } from '../types';

const categorySchema = new Schema<TCategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true, lowercase: true, unique: true },
    level: { type: Number, enum: CATEGORY_LEVELS, required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { timestamps: true },
);

categorySchema.index({ level: 1, parent: 1, value: 1 });

export const Category = model<TCategoryDoc>('Category', categorySchema);
