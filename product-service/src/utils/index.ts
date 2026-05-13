import { AppError } from '@beautinique/be-classes';
import { Types } from 'mongoose';
import slugify from 'slugify';
import type { AuthRequest, TId } from '../types';

/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;
/* ========== NULL CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};

/* ========== OBJECT ID CONVERTER FUNCTION ========== */
export const toObjectId = (id: string): TId => new Types.ObjectId(id);

export const getObjId = (id: string | TId): TId => (typeof id === 'string' ? toObjectId(id) : id);

/* ========== GENERATE SLUG ========== */
export const generateSlug = (text: string, unique = true) => {
  const slug = slugify(text, { lower: true, strict: true, trim: true });

  if (!unique) return slug;

  return `${slug}-${Date.now()}`;
};

/* ========== GET AUTH USER ========== */
export const getUser = (req: AuthRequest) => {
  const user = req.user;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  return user;
};
