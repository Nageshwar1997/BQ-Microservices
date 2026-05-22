import { AppError } from '@beautinique/be-classes';
import type { Request } from 'express';
import { Types } from 'mongoose';
import slugify from 'slugify';
import type { ICategory, TCacheCategory, TId } from '../types';

/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;
/* ========== NULL CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};

/* ========== OBJECT ID CONVERTER FUNCTION ========== */

export const toObjectId = (id: string): TId => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError({ message: 'Invalid object id', code: 'UNPROCESSABLE_ENTITY' });
  }

  return new Types.ObjectId(id);
};

export const getObjId = (id: string | TId): TId => {
  return typeof id === 'string' ? toObjectId(id) : id;
};

/* ========== GENERATE SLUG ========== */
export const generateSlug = (text: string, unique = true) => {
  const slug = slugify(text, { lower: true, strict: true, trim: true });

  if (!unique) return slug;

  return `${slug}-${Date.now()}`;
};

/* ========== GET AUTH USER ========== */
export const getUser = (req: Request) => {
  const user = req.user;

  if (!user) throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });

  return user;
};

export const getMinimalCategory = (category: ICategory): TCacheCategory => {
  const { _id, level, description, parent, name, slug } = category;
  const base = { _id: _id.toString(), name, slug };
  switch (level) {
    case 3: {
      return { ...base, level, parent: parent?.toString() || '', description: description || '' };
    }
    case 2: {
      return { ...base, level, parent: parent?.toString() || '', description: undefined };
    }
    case 1:
    default: {
      return { ...base, level, description: undefined, parent: undefined };
    }
  }
};
