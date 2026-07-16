import { getUser } from '@beautinique/backend-utils';
import { AppError } from '@beautinique/be-classes';
import { CATEGORY_LEVELS_MAP } from '@beautinique/be-constants';
import type { TCategory } from '@beautinique/be-zod';
import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { type ClientSession } from 'mongoose';

import { redisCache } from '../../classes/index.js';
import { Category } from '../../models/index.js';
import { generateSlug, getObjId } from '../../utils/index.js';

export const addCategoryController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const { _id: userId } = getUser(req.user);

  const { name, level, parent: parentId, description } = req.body as TCategory;

  /* ---------------- PARENT ---------------- */

  const parent = parentId ? getObjId(parentId) : undefined;

  if (parent) {
    const parentCategory = await Category.findById(parent)
      .select('level')
      .lean()
      .session(session)
      .exec();

    if (!parentCategory) {
      throw new AppError({ message: 'Parent category not found', code: 'NOT_FOUND' });
    }

    /*
      Level 2 -> Parent must be Level 1
      Level 3 -> Parent must be Level 2
    */

    if (parentCategory.level !== level - 1) {
      throw new AppError({
        message: `Invalid parent category for level ${String(level)}`,
        code: 'UNPROCESSABLE_ENTITY',
      });
    }
  }

  /* ---------------- DUPLICATE CHECK ---------------- */

  const existingCategory = await Category.findOne({ parent, slug: generateSlug(name, false) })
    .select('_id')
    .lean()
    .session(session)
    .exec();

  if (existingCategory) {
    throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
  }

  /* ---------------- CREATE ---------------- */

  const category = new Category({
    name,
    level,
    createdBy: userId,
    ...((level === CATEGORY_LEVELS_MAP.L2 || level === CATEGORY_LEVELS_MAP.L3) && { parent }),
    ...(level === CATEGORY_LEVELS_MAP.L3 && { productCount: 0, description }),
  });

  try {
    await category.save({ session });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
    }

    throw error;
  }

  /* ---------------- UPDATE PARENT ---------------- */

  if (parent) {
    await Category.findByIdAndUpdate(parent, { isLeaf: false }, { session }).exec();
  }

  /* ---------------- REDIS ---------------- */

  await redisCache.category.setCategory(category);

  res.success(201, 'Category created successfully');
};
