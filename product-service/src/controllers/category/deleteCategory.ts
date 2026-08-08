import { NotFoundError, UnprocessableEntityError } from '@beautinique/backend-classes';
import { CATEGORY_LEVELS_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';

import { redisCacheManager } from '../../configs/index.js';
import { Category } from '../../models/index.js';

export const deleteCategoryController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const categoryId = req.params.categoryId as string;

  const categoryObjId = getObjId(categoryId);

  /* ---------------- EXISTING CATEGORY ---------------- */

  const category = await Category.findById(categoryObjId)
    .select('parent level isLeaf productCount')
    .lean()
    .session(session);

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  /* ---------------- CHILD VALIDATION ---------------- */

  if (!category.isLeaf) {
    throw new UnprocessableEntityError('Cannot delete category with child categories');
  }

  /* ---------------- PRODUCT VALIDATION ---------------- */

  if (
    category.level === CATEGORY_LEVELS_MAP.L3 &&
    category.productCount &&
    category.productCount > 0
  ) {
    throw new UnprocessableEntityError('Cannot delete category with products');
  }

  /* ---------------- DELETE CATEGORY ---------------- */

  await Category.findByIdAndDelete(categoryObjId, { session });

  /* ---------------- UPDATE PARENT LEAF ---------------- */

  if (category.parent) {
    const siblingCount = await Category.countDocuments({ parent: category.parent }).session(
      session,
    );

    if (siblingCount === 0) {
      await Category.findByIdAndUpdate(category.parent, { isLeaf: true }, { session });
    }
  }

  /* ---------------- REDIS ---------------- */

  await redisCacheManager.category.deleteCategory(categoryId);

  res.success({ message: 'Category deleted successfully' });
};
