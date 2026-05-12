import { AppError } from '@beautinique/be-classes';
import { Schema, model } from 'mongoose';
import { PRODUCT_STATUSES, TRY_ON_CATEGORIES, TRY_ON_MAP } from '../constants';
import type { ITryOnSchema, TProductDoc, TProductStatus } from '../types';

const tryOnSchema = new Schema<ITryOnSchema>(
  {
    enabled: { type: Boolean, default: false },
    category: { type: String, enum: TRY_ON_CATEGORIES, required: false },
    type: { type: String, required: false },
  },
  { _id: false },
);

export const productSchema = new Schema<TProductDoc>(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    brand: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    originalPrice: { type: Number, required: true, min: 1 },
    sellingPrice: { type: Number, required: true, min: 1 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    totalStock: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 10000 },
    howToUse: { type: String, trim: true, default: '', maxlength: 5000 },
    ingredients: { type: String, trim: true, default: '', maxlength: 5000 },
    additionalDetails: { type: String, trim: true, default: '', maxlength: 5000 },
    commonImages: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator(images: string[]) {
          return images.length <= 10;
        },
        message: 'Maximum 10 images allowed',
      },
    },
    variants: { type: [{ type: Schema.Types.ObjectId, ref: 'Variant' }], default: [] },
    // Always deepest category (Level 3)
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviews: { type: [{ type: Schema.Types.ObjectId, ref: 'Review' }], default: [] },
    totalSales: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'DRAFT', index: true },
    rejectionReason: { type: String, trim: true, default: '', maxlength: 1000 },
    approvedAt: { type: Date, default: null },
    draftExpiresAt: { type: Date, index: true },
    approver: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    tryOn: tryOnSchema,
  },
  { versionKey: false, timestamps: true },
);

// TEXT SEARCH
productSchema.index({ title: 'text', brand: 'text', description: 'text' });

// PRODUCT LISTING
productSchema.index({ category: 1, status: 1, isDeleted: 1 });

// SELLER DASHBOARD
productSchema.index({ seller: 1, createdAt: -1 });

// PRICE FILTERING
productSchema.index({ sellingPrice: 1 });

// BEST SELLING
productSchema.index({ totalSales: -1 });

// TOP RATED
productSchema.index({ averageRating: -1 });

// STATUS + CREATED
productSchema.index({ status: 1, createdAt: -1 });

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

  /**
   * DISCOUNT VALIDATION
   */
  if (this.discount < 0 || this.discount > 100) {
    throw new AppError({
      message: 'Invalid discount percentage',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { discount: ['Discount must be between 0 and 100'] },
    });
  }

  /**
   * DRAFT EXPIRY
   *
   * If product is draft and expiry not exists,
   * automatically set 5 days expiry.
   */
  if (this.status === 'DRAFT' && !this.draftExpiresAt) {
    this.draftExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  }

  /**
   * PENDING / APPROVED
   *
   * Remove draft expiry because
   * product is no longer a draft.
   */
  if (['PENDING', 'APPROVED'].includes(this.status)) {
    this.draftExpiresAt = undefined;
  }

  /**
   * APPROVED PRODUCT VALIDATIONS
   */
  if (this.status === 'APPROVED') {
    // Minimum one image required
    if (this.commonImages.length === 0) {
      throw new AppError({
        message: 'At least one image is required',
        code: 'UNPROCESSABLE_ENTITY',
        fieldErrors: {
          commonImages: ['At least one image is required'],
        },
      });
    }

    // Auto set approvedAt
    if (!this.approvedAt) {
      this.approvedAt = new Date();
    }
  }

  /**
   * RESET APPROVAL INFO
   *
   * If product becomes non-approved
   * reset approval metadata.
   */
  if ((['DRAFT', 'PENDING', 'REJECTED'] as TProductStatus[]).includes(this.status)) {
    this.approvedAt = null;
    this.approver = null;
  }

  /**
   * REJECTED PRODUCT VALIDATION
   */
  if (this.status === 'REJECTED' && !this.rejectionReason?.trim()) {
    throw new AppError({
      message: 'Rejection reason is required',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: {
        rejectionReason: ['Rejection reason is required for rejected products'],
      },
    });
  }

  /*
   * TRY-ON VALIDATIONS
   *
   * If try-on is enabled, make sure
   * category and type are provided.
   */

  if (this.tryOn?.enabled) {
    const { category, type } = this.tryOn;

    if (!category || !type) {
      throw new AppError({
        message: 'Try-on category and type are required',
        code: 'UNPROCESSABLE_ENTITY',
      });
    }

    const allowedTypes = TRY_ON_MAP[category as keyof typeof TRY_ON_MAP];

    if (!allowedTypes.includes(type as never)) {
      throw new AppError({
        message: 'Invalid try-on type',
        code: 'UNPROCESSABLE_ENTITY',
        fieldErrors: {
          tryOn: [`Invalid type "${type}" for category "${category}"`],
        },
      });
    }
  }
});

export const Product = model<TProductDoc>('Product', productSchema);
