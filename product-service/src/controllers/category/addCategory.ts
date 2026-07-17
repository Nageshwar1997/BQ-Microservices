import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TCategoryZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import { CATEGORY_LEVELS_MAP } from '@beautinique/shared-constants';
import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { type ClientSession } from 'mongoose';

import { redisCache } from '../../classes/index.js';
import { Category } from '../../models/index.js';
import { generateSlug } from '../../utils/index.js';

export const addCategoryController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const { _id: userId } = getUser(req.user);

  const { name, level, ...restBody } = req.body as TCategoryZodSchema;

  /* ---------------- PARENT ---------------- */

  const parent = 'parent' in restBody ? getObjId(restBody.parent) : undefined;

  if (parent) {
    const parentCategory = await Category.findById(parent)
      .select('level')
      .lean()
      .session(session)
      .exec();

    if (!parentCategory) {
      throw new NotFoundError('Parent category not found');
    }

    /*
      Level 2 -> Parent must be Level 1
      Level 3 -> Parent must be Level 2
    */

    if (parentCategory.level !== level - 1) {
      throw new UnprocessableEntityError(`Invalid parent category for level ${String(level)}`);
    }
  }

  /* ---------------- DUPLICATE CHECK ---------------- */

  const existingCategory = await Category.findOne({ parent, slug: generateSlug(name, false) })
    .select('_id')
    .lean()
    .session(session)
    .exec();

  if (existingCategory) {
    throw new ConflictError('Category already exists');
  }

  /* ---------------- CREATE ---------------- */

  const category = new Category({
    name,
    level,
    createdBy: userId,
    ...((level === CATEGORY_LEVELS_MAP.L2 || level === CATEGORY_LEVELS_MAP.L3) && { parent }),
    ...(level === CATEGORY_LEVELS_MAP.L3 &&
      'description' in restBody && { productCount: 0, description: restBody.description }),
  });

  try {
    await category.save({ session });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new ConflictError('Category already exists');
    }

    throw error;
  }

  /* ---------------- UPDATE PARENT ---------------- */

  if (parent) {
    await Category.findByIdAndUpdate(parent, { isLeaf: false }, { session }).exec();
  }

  /* ---------------- REDIS ---------------- */

  await redisCache.category.setCategory(category);

  res.success({ statusCode: 201, message: 'Category created successfully' });
};
