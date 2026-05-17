import { Schema } from 'mongoose';
import { CATEGORY_LEVELS } from '../constants';
import { generateSlug } from '../utils';

export const categorySchema = new Schema(
  {
    /* Category Name */
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    /* SEO + Atlas Search Friendly */
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    /* Category Description */
    description: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 150,
      index: true,
      default: null,
    },
    /* 1 -> Main 2 -> Sub 3 -> Final Product Category */
    level: { type: Number, enum: CATEGORY_LEVELS, required: true, index: true },
    /* Parent Category */
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    /* Final category or not */
    isLeaf: { type: Boolean, default: true, index: true },
    /* Useful mainly for level 3 */
    productCount: { type: Number, default: 0, min: 0, index: true },
    /* Uploaded By */
    uploadedBy: { type: Schema.Types.ObjectId, required: true, index: true },
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
  if (this.name) this.slug = generateSlug(this.name, false);
});

/* ---------------- UNIQUE HIERARCHY ---------------- */

categorySchema.index({ parent: 1, slug: 1 }, { unique: true });

/* ---------------- SEARCH INDEXES ---------------- */

// Atlas Search support
categorySchema.index({ name: 'text', slug: 'text', description: 'text' });

// Filter queries
categorySchema.index({ uploadedBy: 1, level: 1 });

// Tree queries
categorySchema.index({ parent: 1, level: 1 });

// Product validation
categorySchema.index({ isLeaf: 1, level: 1 });

// Cleanup queries
categorySchema.index({ productCount: 1, level: 1 });
