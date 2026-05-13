import { Schema, model } from 'mongoose';
import { ROLES_MAP, VARIANT_STATUSES, VARIANT_STATUS_MAP } from '../constants';
import type { TVariantDoc } from '../types';

export const variantSchema = new Schema(
  {
    /* Variant Title */
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120, index: true },
    /* Variant Stock */
    stock: { type: Number, required: true, min: 0, default: 0, index: true },
    /* Product Reference (ref not required as it's a just for understanding) */
    productId: { type: Schema.Types.ObjectId, required: true, index: true },
    /* Variant Images */
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: 'At least one image is required',
      },
    },
    /* Variant Types */
    type: {
      color: { type: String, trim: true, index: true },
      text: { type: String, trim: true, index: true },
    },
    /* PENDING, USED or UNUSED */
    status: {
      type: String,
      enum: VARIANT_STATUSES,
      required: true,
      default: VARIANT_STATUS_MAP.PENDING,
      index: true,
    },
    /* ADMIN, SELLER or MASTER */
    createdByRole: {
      type: String,
      enum: [ROLES_MAP.ADMIN, ROLES_MAP.SELLER, ROLES_MAP.MASTER],
      required: true,
      index: true,
    },
    price: { selling: { type: Number }, original: { type: Number } },
    /* Temporary seller variants */
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  {
    timestamps: true,
    versionKey: false,
    /* Atlas Search Friendly */
    collation: { locale: 'en', strength: 1 },
  },
);

/* ---------------- UNIQUE PRODUCT VARIANT ---------------- */

variantSchema.index({ productId: 1, title: 1 }, { unique: true });

/* ---------------- SEARCH INDEXES ---------------- */

// Atlas Search support
variantSchema.index({ title: 'text', 'type.text': 'text' });

// Fast filtering
variantSchema.index({ status: 1, stock: 1 });

// Product queries
variantSchema.index({ productId: 1, status: 1 });

// Variant filtering
variantSchema.index({ productId: 1, 'type.text': 1 });

// Cleanup queries
variantSchema.index({ createdByRole: 1, expiresAt: 1 });

export const Variant = model<TVariantDoc>('Variant', variantSchema);
