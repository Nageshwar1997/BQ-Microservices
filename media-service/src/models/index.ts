import { RESOURCES, STATUSES, STATUS_MAP } from '@/constants';
import type { TMediaDoc } from '@/types';
import { Schema, Types, model } from 'mongoose';

const MediaSchema = new Schema<TMediaDoc>(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    url: { type: String },
    resourceType: { type: String, enum: RESOURCES, required: true },
    uploadedBy: { type: Types.ObjectId },
    deletedBy: { type: Types.ObjectId },
    relatedTo: {
      service: { type: String, enum: ['user-service'], required: true },
      entity: { type: String },
      entityId: { type: String },
    },
    expiresAt: { type: Date, index: true },
    status: { type: String, enum: STATUSES, default: STATUS_MAP.UNUSED, index: true },
    metadata: { type: Schema.Types.Mixed },
    isDeleted: { type: Boolean, default: false, index: true },
    isUsed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);
MediaSchema.index({ status: 1, expiresAt: 1, isDeleted: 1, isUsed: 1, publicId: 1, url: 1 });

export const Media = model<TMediaDoc>('Media', MediaSchema);
