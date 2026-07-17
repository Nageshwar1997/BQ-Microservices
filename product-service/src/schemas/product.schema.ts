import { UnprocessableEntityError } from '@beautinique/backend-classes';
import type { TTryOnCategory, TTryOnSubCategory } from '@beautinique/backend-types';
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUSES_MAP,
  TRY_ON_ALL_SUB_CATEGORIES,
  TRY_ON_CATEGORIES,
  TRY_ON_MAP,
} from '@beautinique/shared-constants';
import { Schema } from 'mongoose';

import type { ITryOn } from '../types/index.js';

export const variantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ['Color', 'Text'], required: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    originalPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    stock: { type: Number, required: true, min: 0 },
    stockThreshold: { type: Number, required: true, min: 0 },
    images: { type: [String], required: true, default: undefined },
    thumbnail: { type: String },
  },
  { versionKey: false },
);

variantSchema.pre('validate', function () {
  if (this.originalPrice <= 0) {
    throw new UnprocessableEntityError('Invalid original price', {
      fieldErrors: { originalPrice: ['Variant original price must be greater than zero'] },
    });
  }

  if (this.sellingPrice > this.originalPrice) {
    throw new UnprocessableEntityError('Invalid variant pricing', {
      fieldErrors: { sellingPrice: ['Variant original price must be greater than zero'] },
    });
  }

  this.discount = Math.round(((this.originalPrice - this.sellingPrice) / this.originalPrice) * 100);
});

const historySchema = new Schema(
  {
    approvedBy: { type: Schema.Types.ObjectId },
    approvedAt: { type: Date },
    blockedBy: { type: Schema.Types.ObjectId },
    blockedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId },
    rejectedAt: { type: Date },
    rejectReason: { type: String },
  },
  { _id: false, versionKey: false },
);

const tryOnSchema = new Schema<ITryOn>(
  {
    configured: { type: Boolean, required: true, default: false },
    enabled: { type: Boolean, default: false },
    category: {
      type: String,
      enum: TRY_ON_CATEGORIES,
      required: function (): boolean {
        return !!this.get('configured');
      },
    },
    subCategory: {
      type: String,
      enum: TRY_ON_ALL_SUB_CATEGORIES,
      required: function (): boolean {
        return !!this.get('configured');
      },
      validate: {
        validator(value: TTryOnSubCategory) {
          if (!this.get('configured')) {
            return true;
          }
          const category = this.get('category') as TTryOnCategory;

          return TRY_ON_MAP[category].includes(value as never);
        },

        message: 'Invalid sub category for selected category',
      },
    },
  },
  { _id: false, versionKey: false },
);

tryOnSchema.pre('validate', function () {
  const configured = this.get('configured') as boolean;

  if (!configured) {
    return;
  }

  const category = this.get('category') as TTryOnCategory | undefined;

  const subCategory = this.get('subCategory') as TTryOnSubCategory | undefined;

  if (!category) {
    throw new Error('Category is required');
  }

  if (!subCategory) {
    throw new Error('Sub category is required');
  }

  if (!TRY_ON_MAP[category].includes(subCategory as never)) {
    throw new Error('Invalid sub category for selected category');
  }
});

export const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    sku: { type: String, required: true, trim: true, uppercase: true },
    brand: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    originalPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    stock: { type: Number, default: null },
    stockThreshold: { type: Number, default: null },
    shortDescription: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },
    description: { type: String, trim: true, required: true, minlength: 107 },
    instructions: { type: String, trim: true, minlength: 20 },
    ingredients: { type: String, trim: true, minlength: 20 },
    additional: { type: String, trim: true, minlength: 20 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    images: { type: [String], required: true },
    thumbnail: { type: String, required: true },
    video: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true }, // Always deepest category (Level 3)
    seller: { type: Schema.Types.ObjectId, required: true, index: true },
    soldCount: { type: Number, default: 0, min: 0 },
    returnCount: { type: Number, default: 0, min: 0 },
    reviews: { type: [{ type: Schema.Types.ObjectId, ref: 'Review' }], default: [] },
    totalReviews: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRating: { type: Number, default: 0, min: 0 },
    hasVariants: { type: Boolean, required: true },
    variants: { type: [variantSchema], default: [] },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: PRODUCT_STATUSES_MAP.PENDING,
      index: true,
    },
    history: historySchema,
    tryOn: tryOnSchema,
  },
  { versionKey: false, timestamps: true },
);

// TEXT SEARCH
productSchema.index({ title: 'text', brand: 'text', shortDescription: 'text' });

// SKU
productSchema.index({ sku: 1 }, { unique: true });

// CATEGORY LISTING
productSchema.index({ category: 1, status: 1 });

// SELLER PRODUCTS
productSchema.index({ seller: 1, status: 1, createdAt: -1 });

// PRICE SORTING / FILTERING
productSchema.index({ sellingPrice: 1 });

// BEST SELLING
productSchema.index({ soldCount: -1 });

// TOP RATED
productSchema.index({ averageRating: -1 });

// NEWEST PRODUCTS
productSchema.index({ status: 1, createdAt: -1 });

// TRY-ON PRODUCTS
productSchema.index({ 'tryOn.configured': 1 });

// VARIANT PRODUCTS
productSchema.index({ hasVariants: 1 });

// CATEGORY + PRICE FILTERS
productSchema.index({ category: 1, status: 1, sellingPrice: 1 });

// CATEGORY + RATING SORT
productSchema.index({ category: 1, status: 1, averageRating: -1 });

// CATEGORY + SALES SORT
productSchema.index({ category: 1, status: 1, soldCount: -1 });

// VALIDATIONS
productSchema.pre('validate', function () {
  /**
   * PRICE VALIDATIONS
   */
  if (this.originalPrice <= 0) {
    throw new UnprocessableEntityError('Invalid original price', {
      fieldErrors: {
        originalPrice: ['Original price must be greater than zero'],
      },
    });
  }

  if (this.hasVariants) {
    if (!this.variants.length) {
      throw new UnprocessableEntityError('At least one variant is required');
    }

    const skus = new Set<string>();

    for (const variant of this.variants) {
      if (!variant.sku) {
        throw new UnprocessableEntityError('Variant SKU is required');
      }

      if (skus.has(variant.sku)) {
        throw new UnprocessableEntityError('Duplicate variant SKU found');
      }

      skus.add(variant.sku);
    }
  }

  if (this.sellingPrice > this.originalPrice) {
    throw new UnprocessableEntityError('Incompatible selling price and original price', {
      fieldErrors: { sellingPrice: ['Selling price cannot be greater than original price'] },
    });
  }

  /**
   * AUTO CALCULATE DISCOUNT
   */
  this.discount = Math.round(((this.originalPrice - this.sellingPrice) / this.originalPrice) * 100);

  /*
   * TRY-ON VALIDATIONS
   *
   * If try-on is enabled, make sure
   * category and type are provided.
   */

  if (this.tryOn?.enabled) {
    const { category, subCategory } = this.tryOn;

    const subcategories = TRY_ON_MAP[category];

    if (!subcategories.includes(subCategory as never)) {
      throw new UnprocessableEntityError('Invalid try-on sub category', {
        fieldErrors: {
          tryOn: [`Invalid sub category "${subCategory}" for category "${category}"`],
        },
      });
    }
  }
});
