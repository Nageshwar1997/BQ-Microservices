import { Types } from 'mongoose';
import slugify from 'slugify';
import type { TId } from '../types';

/* ---------------- OBJECT ID CONVERTER FUNCTION ---------------- */
export const toObjectId = (id: string): TId => new Types.ObjectId(id);

/* ---------------- GENERATE SLUG ---------------- */
export const generateSlug = (text: string) => {
  const slug = slugify(text, { lower: true, strict: true, trim: true });

  return `${slug}-${Date.now()}`;
};
