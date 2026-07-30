import { Schema } from 'mongoose';

import {
  CONTACT_QUERY_STATUS,
  CONTACT_QUERY_STATUS_MAP,
  CONTACT_QUERY_TYPES,
} from '../constants/index.js';

export const contactQuerySchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true },
    phoneNumber: { type: String, trim: true, required: true },
    queryType: { type: String, enum: CONTACT_QUERY_TYPES, required: true },
    message: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: CONTACT_QUERY_STATUS,
      default: CONTACT_QUERY_STATUS_MAP.OPENED,
      index: true,
    },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);

/* ---------------- ADMIN LISTING ---------------- */

contactQuerySchema.index({ status: 1, createdAt: -1 });

contactQuerySchema.index({ queryType: 1, createdAt: -1 });
