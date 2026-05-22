import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import type { ClientSession } from 'mongoose';
import { redisCache } from '../../classes';
import { Category } from '../../models';
import type { ICategory } from '../../types';
import { generateSlug, getObjId, getUser } from '../../utils';
import type { TUpdateCategory } from '@beautinique/be-zod';

export const updateCategoryController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const userId = getUser(req)._id;

  const { name, level, parent: parentId, description } = req.body as TUpdateCategory;

  const categoryId = getObjId(req.params.categoryId.toString());

  /* ---------------- EXISTING CATEGORY ---------------- */

  const existingCategory = await Category.findById(categoryId)
    .select('parent level')
    .lean()
    .session(session)
    .exec();

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

  const parent = parentId ? getObjId(parentId) : undefined;

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
    .session(session)
    .exec();

  if (duplicateCategory) {
    throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
  }

  /* ---------------- UPDATE ---------------- */

  let updatedCategory: ICategory | null;

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
    ).exec();
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
    })
      .session(session)
      .exec();

    if (oldParentChildrenCount === 0) {
      await Category.findByIdAndUpdate(
        existingCategory.parent,
        { isLeaf: true },
        { session },
      ).exec();
    }
  }

  /* ---------------- NEW PARENT UPDATE ---------------- */

  if (parent) {
    await Category.findByIdAndUpdate(parent, { isLeaf: false }, { session }).exec();
  }

  /* ---------------- REDIS ---------------- */

  if (updatedCategory) {
    await redisCache.setCategory(updatedCategory);
  }

  res.success(200, 'Category updated successfully');
};
