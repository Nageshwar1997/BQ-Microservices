import { AppError } from '@beautinique/be-classes';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { randomInt } from 'node:crypto';
import slugify from 'slugify';
import type { ICategory, IGenerateSku, TCacheCategory, TId } from '../types';

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
      return { ...base, level, parent: parent?.toString() || '' };
    }
    case 1:
    default: {
      return { ...base, level };
    }
  }
};

export const generateSku = ({ data, prefix, unique = true }: IGenerateSku) => {
  const sku = Object.values(data)
    .map((value) =>
      value
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 3)
        .toUpperCase(),
    )
    .filter(Boolean)
    .join('-');

  const finalSku = prefix ? `${prefix}-${sku}` : sku;

  if (!unique) {
    return finalSku;
  }

  const randomPart = randomInt(1, 1_000_000).toString().padStart(6, '0');

  return `${finalSku}-${randomPart}`;
};
