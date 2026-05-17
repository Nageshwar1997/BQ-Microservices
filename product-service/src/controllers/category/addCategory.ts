import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { type ClientSession } from 'mongoose';
import { CATEGORY_LEVELS } from '../../constants';
import { Category } from '../../models';
import { generateSlug, getObjId, getUser } from '../../utils';

export const addCategoryController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const { _id:userId } = getUser(req);

  const { name, level, parentId } = req.body ?? {};

  /* ---------------- VALIDATIONS ---------------- */

  if (!name || !level) {
    throw new AppError({ message: 'All fields are required', code: 'UNPROCESSABLE_ENTITY' });
  }

  if (!CATEGORY_LEVELS.includes(level)) {
    throw new AppError({ message: 'Invalid category level', code: 'UNPROCESSABLE_ENTITY' });
  }

  if (level !== 1 && !parentId) {
    throw new AppError({ message: 'Parent category is required', code: 'UNPROCESSABLE_ENTITY' });
  }

  /* ---------------- PARENT ---------------- */

  const parent = parentId ? getObjId(parentId) : null;

  if (parent) {
    const parentCategory = await Category.findById(parent).select('level').lean().session(session);

    if (!parentCategory) {
      throw new AppError({ message: 'Parent category not found', code: 'NOT_FOUND' });
    }

    /*
      Level 2 -> Parent must be Level 1
      Level 3 -> Parent must be Level 2
    */

    if (parentCategory.level !== level - 1) {
      throw new AppError({
        message: `Invalid parent category for level ${level}`,
        code: 'UNPROCESSABLE_ENTITY',
      });
    }
  }

  /* ---------------- DUPLICATE CHECK ---------------- */

  const slug = generateSlug(name, false);

  const existingCategory = await Category.findOne({ parent, slug })
    .select('_id')
    .lean()
    .session(session);

  if (existingCategory) {
    throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
  }

  /* ---------------- CREATE ---------------- */

  const category = new Category({
    name,
    level,
    parent,
    uploadedBy: userId,
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
    await Category.findByIdAndUpdate(parent, { isLeaf: false }, { session });
  }

  res.success(201, 'Category created successfully', { category });
};
