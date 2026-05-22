import { AppError } from '@beautinique/be-classes';
import { CATEGORY_LEVELS, CATEGORY_LEVELS_MAP } from '@beautinique/be-constants';
import type { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import type { ClientSession } from 'mongoose';
import { redisCache } from '../../classes';
import { Category } from '../../models';
import type { TCacheCategory } from '../../types';
import { generateSlug, getObjId, getUser } from '../../utils';

export const updateCategoryController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const userId = getUser(req)._id;

  const { name, level, parent: parentId, description } = req.body ?? {};

  const categoryId = getObjId(req.params.categoryId.toString());

  /* ---------------- VALIDATIONS ---------------- */

  if (!name || !level) {
    throw new AppError({ message: 'All fields are required', code: 'UNPROCESSABLE_ENTITY' });
  }

  if (!CATEGORY_LEVELS.includes(level)) {
    throw new AppError({ message: 'Invalid category level', code: 'UNPROCESSABLE_ENTITY' });
  }

  if (level !== CATEGORY_LEVELS_MAP.L1 && !parentId) {
    throw new AppError({ message: 'Parent category is required', code: 'UNPROCESSABLE_ENTITY' });
  }

  /* ---------------- EXISTING CATEGORY ---------------- */

  const existingCategory = await Category.findById(categoryId)
    .select('parent level')
    .lean()
    .session(session);

  if (!existingCategory) {
    throw new AppError({ message: 'Category not found', code: 'NOT_FOUND' });
  }

  /* ---------------- LEVEL IMMUTABLE ---------------- */

  if (existingCategory.level !== level) {
    throw new AppError({
      message: 'Category level cannot be changed',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  /* ---------------- PARENT ---------------- */

  const parent = parentId ? getObjId(parentId) : null;

  if (parent) {
    // self parent check
    if (parent.equals(categoryId)) {
      throw new AppError({
        message: 'Category cannot be its own parent',
        code: 'UNPROCESSABLE_ENTITY',
      });
    }

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

  const duplicateCategory = await Category.findOne({ _id: { $ne: categoryId }, parent, slug })
    .select('_id')
    .lean()
    .session(session);

  if (duplicateCategory) {
    throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
  }

  /* ---------------- UPDATE ---------------- */

  let updatedCategory: TCacheCategory | null;

  try {
    updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        name,
        slug,
        parent,
        ...(description && { description }),
        updatedBy: userId,
      },
      {
        session,
        new: true,
        lean: true,
        select: '_id name slug parent level description',
      },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
    }

    throw error;
  }

  /* ---------------- OLD PARENT LEAF CHECK ---------------- */

  if (existingCategory.parent && String(existingCategory.parent) !== String(parent)) {
    const oldParentChildrenCount = await Category.countDocuments({
      parent: existingCategory.parent,
      _id: { $ne: categoryId },
    }).session(session);

    if (oldParentChildrenCount === 0) {
      await Category.findByIdAndUpdate(existingCategory.parent, { isLeaf: true }, { session });
    }
  }

  /* ---------------- NEW PARENT UPDATE ---------------- */

  if (parent) {
    await Category.findByIdAndUpdate(parent, { isLeaf: false }, { session });
  }

  /* ---------------- REDIS ---------------- */

  /* ---------------- REDIS ---------------- */

  if (updatedCategory) {
    await redisCache.setCategory(updatedCategory);
  }

  res.success(200, 'Category updated successfully');
};
