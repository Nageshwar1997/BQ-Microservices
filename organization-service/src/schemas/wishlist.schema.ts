import { Schema } from 'mongoose';

export const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  { versionKey: false, timestamps: true },
);

wishlistSchema.index({ user: 1 }, { unique: true });
