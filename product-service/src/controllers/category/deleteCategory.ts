import { AppError } from '@beautinique/be-classes';
import { CATEGORY_LEVELS_MAP } from '@beautinique/be-constants';
import type { Request, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { redisCache } from '../../classes';
import { Category } from '../../models';
import { getObjId } from '../../utils';

export const deleteCategoryController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const categoryId = req.params?.categoryId?.toString();

  const categoryObjId = getObjId(categoryId);

  /* ---------------- EXISTING CATEGORY ---------------- */

  const category = await Category.findById(categoryObjId)
    .select('parent level isLeaf productCount')
    .lean()
    .session(session);

  if (!category) {
    throw new AppError({ message: 'Category not found', code: 'NOT_FOUND' });
  }

  /* ---------------- CHILD VALIDATION ---------------- */

  if (!category.isLeaf) {
    throw new AppError({
      message: 'Cannot delete category with child categories',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  /* ---------------- PRODUCT VALIDATION ---------------- */

  if (
    category.level === CATEGORY_LEVELS_MAP.L3 &&
    category.productCount &&
    category.productCount > 0
  ) {
    throw new AppError({
      message: 'Cannot delete category with products',
      code: 'UNPROCESSABLE_ENTITY',
    });
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

  await redisCache.deleteCategory(categoryId);

  res.success(200, 'Category deleted successfully');
};
