import { CATEGORY_LEVELS_MAP } from '@beautinique/be-constants';
import type { TCategory } from '@beautinique/be-zod';
import type { Request, Response } from 'express';
import { redisCache } from '../../classes';

export const getCategoriesByParentLevel = async (req: Request, res: Response) => {
  const parentId = req.query.parent?.toString() as TCategory['parent'];
  const level = Number(req.query.level) as TCategory['level'];

  const allCategories = await redisCache.getAllCategories();

  const categories = allCategories.filter((category) => {
    // If level is not provided → return all categories
    if (!level) return true;

    // Level mismatch
    if (category.level !== level) return false;

    // Level 1 → Parent check not required
    if (level === CATEGORY_LEVELS_MAP.L1) return true;

    // Level 2 & 3 → parent check required
    return category.parent?.toString() === parentId;
  });

  res.success(200, 'Categories fetched successfully', { categories });
};
