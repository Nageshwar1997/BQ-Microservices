import {
  MEDIA_RESOURCES,
  MEDIA_STATUS_MAP,
  MEDIA_STATUSES,
  SERVICES,
} from '@beautinique/be-constants';
import { model, Schema } from 'mongoose';

export const mediaSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true, unique: true },
    resourceType: { type: String, enum: MEDIA_RESOURCES, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    relatedTo: { service: { type: String, enum: SERVICES }, entity: { type: String } },
    expiresAt: { type: Date },
    deletedAt: { type: Date, index: true },
    status: { type: String, enum: MEDIA_STATUSES, default: MEDIA_STATUS_MAP.UNUSED, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

/* ---------------- INDEXES ---------------- */

mediaSchema.index({ status: 1, expiresAt: 1 });

/* ---------------- TTL INDEX ---------------- */

mediaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Media = model('Media', mediaSchema);
