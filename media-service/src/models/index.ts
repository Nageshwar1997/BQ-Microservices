import {
  MEDIA_RESOURCES,
  MEDIA_STATUSES,
  MEDIA_STATUS_MAP,
  SERVICES,
} from '@beautinique/be-constants';
import { Schema, model } from 'mongoose';
import type { TMediaDoc } from '../types';

const mediaSchema = new Schema<TMediaDoc>(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    url: { type: String },
    resourceType: { type: String, enum: MEDIA_RESOURCES, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    relatedTo: { service: { type: String, enum: SERVICES }, entity: { type: String } },
    expiresAt: { type: Date, index: true },
    deletedAt: { type: Date, index: true },
    status: { type: String, enum: MEDIA_STATUSES, default: MEDIA_STATUS_MAP.UNUSED, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

/* ---------------- INDEXES ---------------- */

mediaSchema.index({ publicId: 1 }, { unique: true });
mediaSchema.index({ status: 1, expiresAt: 1 });

/* ---------------- TTL INDEX ---------------- */

mediaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Media = model<TMediaDoc>('Media', mediaSchema);
