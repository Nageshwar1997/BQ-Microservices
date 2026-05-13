import { Schema, model } from 'mongoose';
import { CATEGORY_LEVELS, CATEGORY_STATUS, CATEGORY_STATUS_MAP, ROLES_MAP } from '../constants';
import type { TCategoryDoc } from '../types';
import { generateSlug } from '../utils';

const categorySchema = new Schema<TCategoryDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    /* SEO + Atlas Search Friendly */
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    /*
      1 -> Main
      2 -> Sub
      3 -> Final Product Category
    */
    level: { type: Number, enum: CATEGORY_LEVELS, required: true, index: true },
    /* Parent category */
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    /* Product count only useful for LEVEL 3 categories */
    productCount: { type: Number, default: 0, min: 0, index: true },
    /* ADMIN, SELLER or MASTER */
    createdByRole: {
      type: String,
      enum: [ROLES_MAP.ADMIN, ROLES_MAP.SELLER, ROLES_MAP.MASTER],
      required: true,
      index: true,
    },
    /* PENDING, USED or UNUSED */
    status: {
      type: String,
      enum: CATEGORY_STATUS,
      default: CATEGORY_STATUS_MAP.PENDING,
      index: true,
    },
    /* Auto delete temporary seller categories */
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  {
    timestamps: true,
    versionKey: false,
    /* Atlas Search Friendly */
    collation: { locale: 'en', strength: 1 },
  },
);

/* ---------------- AUTO SLUG ---------------- */

categorySchema.pre('validate', function () {
  if (this.name) {
    this.slug = generateSlug(this.name, false);
  }
});

/* ---------------- UNIQUE HIERARCHY ---------------- */

categorySchema.index(
  { level: 1, parent: 1, slug: 1 },
  {
    unique: true,
    /* Ignore unused categories */
    partialFilterExpression: { status: { $ne: CATEGORY_STATUS_MAP.UNUSED } },
  },
);

/* ---------------- SEARCH INDEXES ---------------- */

// Atlas Search support
categorySchema.index({ name: 'text', slug: 'text' });

// Fast filtering
categorySchema.index({ status: 1, level: 1 });

// Tree queries
categorySchema.index({ parent: 1, level: 1 });

// Cleanup queries
categorySchema.index({ productCount: 1, createdByRole: 1 });

export const Category = model<TCategoryDoc>('Category', categorySchema);
