import { Types } from 'mongoose';
import slugify from 'slugify';
import type { TId } from '../types';

/* ---------------- OBJECT ID CONVERTER FUNCTION ---------------- */
export const toObjectId = (id: string): TId => new Types.ObjectId(id);

/* ---------------- GENERATE SLUG ---------------- */
export const generateSlug = (text: string, unique = true) => {
  const slug = slugify(text, { lower: true, strict: true, trim: true });

  if (!unique) return slug;

  return `${slug}-${Date.now()}`;
};
