import { AppError } from '@beautinique/be-classes';
import { Schema } from 'mongoose';
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_MAP,
  TRY_ON_CATEGORIES,
  TRY_ON_MAP,
  TRY_ON_SUBCATEGORIES,
} from '../constants';
import type { ITryOn, TTryOn, TTryOnKey } from '../types';

export const variantSchema = new Schema(
  {
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
    throw new AppError({
      message: 'Variant original price must be greater than zero',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: {
        originalPrice: ['Variant original price must be greater than zero'],
      },
    });
  }

  if (this.sellingPrice > this.originalPrice) {
    throw new AppError({
      message: 'Invalid variant pricing',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: {
        sellingPrice: ['Variant selling price cannot be greater than original price'],
      },
    });
  }

  this.discount = Math.round(((this.originalPrice - this.sellingPrice) / this.originalPrice) * 100);
});

const contentSchema = new Schema(
  {
    description: { type: String, trim: true, required: true, minlength: 107 },
    ingredients: { type: String, trim: true, minlength: 20 },
    instructions: { type: String, trim: true, minlength: 20 },
    other: { type: String, trim: true, minlength: 20 },
  },
  { _id: false, versionKey: false },
);

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
        return this.get('configured');
      },
    },
    subCategory: {
      type: String,
      enum: TRY_ON_SUBCATEGORIES,
      required: function (): boolean {
        return this.get('configured');
      },
      validate: {
        validator(value: TTryOn[TTryOnKey][number]) {
          if (!this.get('configured')) {
            return true;
          }
          const category = this.get('category') as TTryOnKey;

          return TRY_ON_MAP[category]?.includes(value as never);
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

  const category = this.get('category') as TTryOnKey;

  const subCategory = this.get('subCategory') as TTryOn[TTryOnKey][number];

  if (!category) {
    throw new Error('Category is required');
  }

  if (!subCategory) {
    throw new Error('Sub category is required');
  }

  if (!TRY_ON_MAP[category]?.includes(subCategory as never)) {
    throw new Error('Invalid sub category for selected category');
  }
});

export const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    brand: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    originalPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    stock: { type: Number, min: 0 },
    stockThreshold: { type: Number, min: 0 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },
    content: contentSchema,
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    images: { type: [String], required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true }, // Always deepest category (Level 3)
    seller: { type: Schema.Types.ObjectId, required: true, index: true },
    saleCount: { type: Number, default: 0, min: 0 },
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
      default: PRODUCT_STATUS_MAP.PENDING,
      index: true,
    },
    history: historySchema,
    tryOn: tryOnSchema,
  },
  { versionKey: false, timestamps: true },
);

// TEXT SEARCH
productSchema.index({ title: 'text', brand: 'text', description: 'text' });

// CATEGORY LISTING
productSchema.index({ category: 1, status: 1 });

// SELLER PRODUCTS
productSchema.index({ seller: 1, status: 1, createdAt: -1 });

// PRICE SORTING / FILTERING
productSchema.index({ sellingPrice: 1 });

// BEST SELLING
productSchema.index({ saleCount: -1 });

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
productSchema.index({ category: 1, status: 1, saleCount: -1 });

// VALIDATIONS
productSchema.pre('validate', function () {
  /**
   * PRICE VALIDATIONS
   */
  if (this.originalPrice <= 0) {
    throw new AppError({
      message: 'Original price must be greater than zero',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: {
        originalPrice: ['Original price must be greater than zero'],
      },
    });
  }

  if (this.sellingPrice > this.originalPrice) {
    throw new AppError({
      message: 'Incompatible selling price and original price',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: {
        sellingPrice: ['Selling price cannot be greater than original price'],
      },
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

    if (!category || !subCategory) {
      throw new AppError({
        message: 'Try-on category and type are required',
        code: 'UNPROCESSABLE_ENTITY',
      });
    }

    const subcategories = TRY_ON_MAP[category];

    if (!subcategories.includes(subCategory as never)) {
      throw new AppError({
        message: 'Invalid try-on type',
        code: 'UNPROCESSABLE_ENTITY',
        fieldErrors: {
          tryOn: [`Invalid type "${subCategory}" for category "${category}"`],
        },
      });
    }
  }
});
