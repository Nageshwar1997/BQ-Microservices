import { Schema, model } from 'mongoose';
import slugify from 'slugify';
import { CATEGORY_LEVELS, CATEGORY_STATUS, CATEGORY_STATUS_MAP } from '../constants';
import type { TCategoryDoc } from '../types';

const categorySchema = new Schema<TCategoryDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true }, // Atlas Search + SEO Friendly
    level: { type: Number, enum: CATEGORY_LEVELS, required: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    status: {
      type: String,
      enum: CATEGORY_STATUS,
      default: CATEGORY_STATUS_MAP.DRAFT,
      index: true,
    },
    expiresAt: { type: Date, index: { expires: 0 } }, // Auto delete draft categories if no product linked
  },
  { timestamps: true, versionKey: false, collation: { locale: 'en', strength: 1 } }, // Atlas Search friendly
);

/* ---------------- AUTO SLUG ---------------- */

categorySchema.pre('validate', function () {
  if (this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true, trim: true });
  }
});

/* ---------------- UNIQUE HIERARCHY ---------------- */

categorySchema.index(
  { level: 1, parent: 1, slug: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: CATEGORY_STATUS_MAP.UNUSED } },
  },
);

/* ---------------- SEARCH INDEXES ---------------- */

// Atlas Search support
categorySchema.index({ name: 'text', slug: 'text' });

// Fast filtering
categorySchema.index({ status: 1, level: 1 });

// Tree queries
categorySchema.index({ parent: 1, status: 1 });

export const Category = model<TCategoryDoc>('Category', categorySchema);
