import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { type ClientSession } from 'mongoose';
import { CATEGORY_LEVELS, CATEGORY_STATUS_MAP } from '../../constants';
import { Category } from '../../models';
import { generateSlug, getObjId, getUser } from '../../utils';

const CATEGORY_LEVEL_ACCESS: Record<number, string[]> = {
  1: ['ADMIN', 'MASTER'],
  2: ['ADMIN', 'MASTER'],
  3: ['ADMIN', 'SELLER', 'MASTER'],
};

export const createCategoryController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const { name, level, parentId } = req.body ?? {};

  const { role } = getUser(req);

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

  if (!allowedRoles?.includes(role)) {
    throw new AppError({
      message: 'You are not allowed to create this category level',
      code: 'AUTHORIZATION_ERROR',
    });
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

  /* ---------------- STATUS ---------------- */

  /*
    SELLER -> PENDING
    ADMIN/MASTER -> USED
  */

  const status = role === 'SELLER' ? CATEGORY_STATUS_MAP.PENDING : CATEGORY_STATUS_MAP.USED;

  /* ---------------- EXPIRES ---------------- */

  /*
    Temporary seller categories
  */

  const expiresAt =
    level === 3 && role === 'SELLER' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

  /* ---------------- CREATE ---------------- */

  const category = new Category({
    name,
    level,
    parent,
    status,
    expiresAt,
    createdByRole: role,
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
