import type { TId } from '@/types';
import { Types } from 'mongoose';

/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;
/* ========== NULL CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};

/* ========== OBJECT ID CONVERTER FUNCTION ========== */
export const toObjectId = (id: string): TId => new Types.ObjectId(id);
