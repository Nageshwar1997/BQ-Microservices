import {
  MEDIA_RESOURCES,
  MEDIA_STATUSES,
  MEDIA_STATUS_MAP,
  SERVICES,
} from '@beautinique/be-constants';
import { Schema, Types, model } from 'mongoose';
import type { TMediaDoc } from '../types';

const mediaSchema = new Schema<TMediaDoc>(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    url: { type: String },
    resourceType: { type: String, enum: MEDIA_RESOURCES, required: true },
    uploadedBy: { type: Types.ObjectId },
    deletedBy: { type: Types.ObjectId },
    relatedTo: {
      service: { type: String, enum: SERVICES },
      entity: { type: String },
      entityId: { type: String },
    },
    expiresAt: { type: Date, index: true },
    status: { type: String, enum: MEDIA_STATUSES, default: MEDIA_STATUS_MAP.UNUSED, index: true },
    metadata: { type: Schema.Types.Mixed },
    isDeleted: { type: Boolean, default: false, index: true },
    isUsed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);
mediaSchema.index({ status: 1, expiresAt: 1, isDeleted: 1, isUsed: 1, publicId: 1, url: 1 });

export const Media = model<TMediaDoc>('Media', mediaSchema);
