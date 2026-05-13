import { AppError } from '@beautinique/be-classes';
import type { Response } from 'express';
import { CATEGORY_LEVELS, CATEGORY_STATUS_MAP } from '../../constants';
import { Category } from '../../models';
import type { AuthRequest } from '../../types';
import { generateSlug, toObjectId } from '../../utils';

const CATEGORY_LEVEL_ACCESS: Record<number, string[]> = {
  1: ['ADMIN', 'MASTER'],
  2: ['ADMIN', 'MASTER'],
  3: ['ADMIN', 'SELLER', 'MASTER'],
};

export const createCategoryController = async (req: AuthRequest, res: Response) => {
  const { name, level, parentId } = req.body ?? {};

  const role = req.user?.role;

  if (!role) {
    throw new AppError({ message: 'You are not logged in', code: 'AUTHENTICATION_ERROR' });
  }
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

  const existingCategory = await Category.findOne({
    level,
    parent: parentObjId,
    slug: generateSlug(name, false),
    status: { $ne: CATEGORY_STATUS_MAP.UNUSED },
  });

  if (existingCategory) {
    throw new AppError({ message: 'Category already exists', code: 'CONFLICT' });
  }

  if (parentObjId) {
    const parentCategory = await Category.findById(parentObjId);

    if (!parentCategory) {
      throw new AppError({ message: 'Parent category not found', code: 'NOT_FOUND' });
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

  /* ---------------- CATEGORY STATUS ---------------- */

  /*
    Admin categories directly USED

    Seller categories start as PENDING
  */

  const status = role === 'SELLER' ? CATEGORY_STATUS_MAP.PENDING : CATEGORY_STATUS_MAP.USED;

  /* ---------------- AUTO DELETE TIMER ---------------- */

  /*
    Temporary categories only for
    Seller level 3 categories
  */

  const expiresAt =
    level === 3 && role === 'SELLER' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;
  /* ---------------- CREATE CATEGORY ---------------- */

  const category = await Category.create({
    name,
    level,
    parent: parentObjId,
    status,
    expiresAt,
    createdByRole: role,
  });

  res.success(200, 'Category created successfully', { category });
};
