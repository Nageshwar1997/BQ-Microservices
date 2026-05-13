import { AppError } from '@beautinique/be-classes';
import type { ClientSession } from 'mongoose';
import { Category } from '../models';
import type { TCategory } from '../types';

export const findOrCreateCategory = async ({
  name,
  slug,
  parent = null,
  level,
  session,
}: Partial<Omit<TCategory, '_id'>> & { session?: ClientSession }) => {
  try {
    const category = await Category.findOneAndUpdate(
      { slug, level, parent },
      { $setOnInsert: { name, slug, level, parent } },
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
