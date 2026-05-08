import { AppError } from '@beautinique/be-classes';
import type { ClientSession } from 'mongoose';
import { Category } from '../models';
import type { TCategory } from '../types';

export const findOrCreateCategory = async ({
  name,
  value,
  parent = null,
  level,
  session,
}: Omit<TCategory, '_id'> & { session?: ClientSession }) => {
  try {
    const category = await Category.findOneAndUpdate(
      { value, level, parent },
      { $setOnInsert: { name, value, level, parent } },
      { upsert: true, new: true, session },
    );

    return category;
  } catch (error) {
    throw new AppError({
      message: error instanceof Error ? error.message : 'Category error',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
};
