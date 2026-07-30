import {
  CONTACT_QUERY_STATUS,
  CONTACT_QUERY_STATUS_MAP,
  CONTACT_QUERY_TYPES,
} from '@beautinique/backend-constants';
import { Schema } from 'mongoose';

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
    // Set only for terminal statuses (CLOSED / REJECTED) - see
    // `CONTACT_QUERY_RETENTION_MS_MAP` and `updateContactQueryStatusController`.
    // Null/unset for every other status, which the TTL index below ignores.
    expiresAt: { type: Date, default: null },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);

/* ---------------- ADMIN LISTING ---------------- */

contactQuerySchema.index({ status: 1, createdAt: -1 });

contactQuerySchema.index({ queryType: 1, createdAt: -1 });

/* ---------------- AUTO-DELETE (TTL) ---------------- */

contactQuerySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
