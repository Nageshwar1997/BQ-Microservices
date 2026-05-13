import { AppError } from '@beautinique/be-classes';
import type { Response } from 'express';

import { CATEGORY_LEVELS } from '../../constants';
import { Category } from '../../models';

import type { AuthRequest } from '../../types';

import { toObjectId } from '../../utils';

const CATEGORY_LEVEL_ACCESS: Record<number, string[]> = {
  1: ['ADMIN'],
  2: ['ADMIN'],
  3: ['ADMIN', 'SELLER', 'MASTER'],
};

export const createCategoryController = async (req: AuthRequest, res: Response) => {
  const { name, level, parentId } = req.body ?? {};

  const role = req.user?.role;

  /* ---------------- VALIDATIONS ---------------- */

  if (!name || !level) {
    throw new AppError({
      message: 'All fields are required',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  if (!CATEGORY_LEVELS.includes(level)) {
    throw new AppError({
      message: 'Invalid category level',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  if (level !== 1 && !parentId) {
    throw new AppError({
      message: 'Parent category is required',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  /* ---------------- ROLE ACCESS ---------------- */

  const allowedRoles = CATEGORY_LEVEL_ACCESS[level];

  if (!allowedRoles?.includes(role || '')) {
    throw new AppError({
      message: 'You are not allowed to create this category level',
      code: 'AUTHORIZATION_ERROR',
    });
  }

  /* ---------------- PARENT VALIDATION ---------------- */

  const parentObjId = parentId ? toObjectId(parentId) : null;

  if (parentObjId) {
    const parentCategory = await Category.findById(parentObjId);

    if (!parentCategory) {
      throw new AppError({
        message: 'Parent category not found',
        code: 'NOT_FOUND',
      });
    }

    /*
      Hierarchy validation

      Level 2 -> parent must be level 1
      Level 3 -> parent must be level 2
    */

    if (parentCategory.level !== level - 1) {
      throw new AppError({
        message: `Invalid parent category for level ${level}`,
        code: 'UNPROCESSABLE_ENTITY',
      });
    }
  }

  /* ---------------- CREATE CATEGORY ---------------- */

  const category = await Category.create({ name, level, parent: parentObjId });

  return res
    .status(201)
    .json({ success: true, message: 'Category created successfully', data: category });
};
