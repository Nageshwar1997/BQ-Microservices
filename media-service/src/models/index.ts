import type { IMedia } from '@/types';
import { Schema, Types, model } from 'mongoose';

const MediaSchema = new Schema<IMedia>(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    url: { type: String },
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    uploadedBy: { type: Types.ObjectId },
    deletedBy: { type: Types.ObjectId },
    relatedTo: {
      service: { type: String, enum: ['user-service'], required: true },
      entity: { type: String },
      entityId: { type: String },
    },
    expiresAt: { type: Date, index: true },
    status: { type: String, enum: ['pending', 'used', 'deleted'], default: 'pending', index: true },
    metadata: { type: Schema.Types.Mixed },
    isDeleted: { type: Boolean, default: false, index: true },
    isUsed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);
MediaSchema.index({ status: 1, expiresAt: 1, isDeleted: 1, isUsed: 1, publicId: 1, url: 1 });

export const Media = model<IMedia>('Media', MediaSchema);
