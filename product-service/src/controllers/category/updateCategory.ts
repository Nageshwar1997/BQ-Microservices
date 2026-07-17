import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import { getUser } from '@beautinique/backend-utils';
import type { TUpdateCategory } from '@beautinique/be-zod';
import { CATEGORY_LEVELS_MAP } from '@beautinique/shared-constants';
import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import type { ClientSession } from 'mongoose';

import { redisCache } from '../../classes/index.js';
import { Category } from '../../models/index.js';
import type { ICategory } from '../../types/index.js';
import { generateSlug } from '../../utils/index.js';

export const updateCategoryController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const { _id: userId } = getUser(req.user);

  const { name, parent: parentId, description } = req.body as TUpdateCategory;

  const categoryId = getObjId(req.params.categoryId?.toString() ?? '');

  /* ---------------- EXISTING CATEGORY ---------------- */

  const existingCategory = await Category.findById(categoryId)
    .select('parent level')
    .lean()
    .session(session)
    .exec();

  if (!existingCategory) {
    throw new NotFoundError('Category not found');
  }

  const level = existingCategory.level;

  /* ---------------- LEVEL FIELD VALIDATION ---------------- */

  if (level === CATEGORY_LEVELS_MAP.L1) {
    if (parentId || description) {
      throw new UnprocessableEntityError(
        `Level ${String(level)} category cannot have parent or description`,
      );
    }
  }

  if (level === CATEGORY_LEVELS_MAP.L2) {
    if (description) {
      throw new UnprocessableEntityError(`Level ${String(level)} category cannot have description`);
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
        throw new ConflictError('Category cannot be its own parent');
      }

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
      throw new ConflictError('Category already exists');
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
      throw new ConflictError('Category already exists');
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
    await redisCache.category.setCategory(updatedCategory);
  }

  res.success({ message: 'Category updated successfully' });
};
