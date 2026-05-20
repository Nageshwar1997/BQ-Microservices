import type { Request, Response } from 'express';
import { redisCache } from '../../classes';
import { CATEGORY_LEVELS_MAP } from '../../constants';

export const getCategoriesByParentLevel = async (req: Request, res: Response) => {
  const parent = req.query.parent?.toString();
  const level = Number(req.query.level);

  const allCategories = await redisCache.getAllCategories();

  const categories = allCategories.filter((category) => {
    // If level is not provided → return all categories
    if (!level) return true;

    // Level mismatch
    if (category.level !== level) return false;

    // Level 1 → Parent check not required
    if (level === CATEGORY_LEVELS_MAP.L1) return true;

    // Level 2 & 3 → parent check required
    return category.parent?.toString() === parent;
  });

  res.success(200, 'Categories fetched successfully', { categories });
};
