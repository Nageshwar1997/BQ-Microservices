import { AppError } from '@beautinique/be-classes';
import { CATEGORY_LEVELS_MAP } from '@beautinique/be-constants';
import type { TUpdateCategory } from '@beautinique/be-zod';
import type { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import type { ClientSession } from 'mongoose';
import { redisCache } from '../../classes';
import { Category } from '../../models';
import type { ICategory } from '../../types';
import { generateSlug, getObjId, getUser } from '../../utils';

export const updateCategoryController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const userId = getUser(req)._id;

  const { name, parent: parentId, description } = req.body as TUpdateCategory;

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

  const level = existingCategory.level;

  /* ---------------- LEVEL FIELD VALIDATION ---------------- */

  if (level === CATEGORY_LEVELS_MAP.L1) {
    if (parentId || description) {
      throw new AppError({
        message: `Level ${level} category cannot have parent or description`,
        code: 'UNPROCESSABLE_ENTITY',
      });
    }
  }

  if (level === CATEGORY_LEVELS_MAP.L2) {
    if (description) {
      throw new AppError({
        message: `Level ${level} category cannot have description`,
        code: 'UNPROCESSABLE_ENTITY',
      });
    }
  }

  /* ---------------- PARENT ---------------- */

  let parent: ICategory['_id'] | undefined;

  // only validate/update parent if explicitly provided
  if (parentId) {
    parent = parentId ? getObjId(parentId) : undefined;

    if (parent) {
      // self parent check
      if (parent.equals(categoryId)) {
        throw new AppError({
          message: 'Category cannot be its own parent',
          code: 'UNPROCESSABLE_ENTITY',
        });
      }

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
          message: `Invalid parent category for level ${level}`,
          code: 'UNPROCESSABLE_ENTITY',
        });
      }
    }
  }

  /* ---------------- DUPLICATE CHECK ---------------- */

  let slug: string | undefined;

  if (name) {
    slug = generateSlug(name, false);

    const duplicateCategory = await Category.findOne({
      _id: { $ne: categoryId },
      parent: parentId ? parent : existingCategory.parent,
      slug,
    })
      .select('_id')
      .lean()
      .session(session)
      .exec();

    if (duplicateCategory) {
      throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
    }
  }

  /* ---------------- UPDATE PAYLOAD ---------------- */

  const payload: Partial<ICategory> = { updatedBy: userId };

  if (name) {
    payload.name = name;
    payload.slug = slug;
  }

  if (parentId) {
    payload.parent = parent;
  }

  if (level === CATEGORY_LEVELS_MAP.L3 && description) {
    payload.description = description;
  }

  /* ---------------- UPDATE ---------------- */

  let updatedCategory: ICategory | null;

  try {
    updatedCategory = await Category.findByIdAndUpdate(categoryId, payload, {
      session,
      new: true,
      lean: true,
      select: '_id name slug parent level description',
      runValidators: true,
    }).exec();
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
    }

    throw error;
  }

  /* ---------------- PARENT LEAF SYNC ---------------- */

  const oldParentId = existingCategory.parent?.toString();
  const newParentId = parentId ? parent?.toString() : oldParentId;

  if (oldParentId !== newParentId) {
    // old parent leaf check
    if (existingCategory.parent) {
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

    // new parent can never be leaf
    if (parent) {
      await Category.findByIdAndUpdate(parent, { isLeaf: false }, { session }).exec();
    }
  }

  /* ---------------- REDIS ---------------- */

  if (updatedCategory) {
    await redisCache.setCategory(updatedCategory);
  }

  res.success(200, 'Category updated successfully');
};
