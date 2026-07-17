import type { TCategory } from '@beautinique/be-zod';
import { CATEGORY_LEVELS_MAP } from '@beautinique/shared-constants';
import type { Request, Response } from 'express';

import { redisCache } from '../../classes/index.js';
import type { TCategoryHierarchy } from '../../types/index.js';

export const getCategoriesByParentLevel = async (req: Request, res: Response) => {
  const parentId = req.query.parent as string;
  const level = Number(req.query.level) as TCategory['level'] | undefined;

  const allCategories = await redisCache.category.getAllCategories();

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

  res.success({ message: 'Categories fetched successfully', data: categories });
};

export const getCategoriesByHierarchy = async (_req: Request, res: Response) => {
  const allCategories = await redisCache.category.getAllCategories();

  // Parent wise map
  const parentMap = new Map<string, TCategoryHierarchy[]>();

  // Prepare map
  allCategories.forEach((category) => {
    if (!category.parent) return;

    if (!parentMap.has(category.parent)) {
      parentMap.set(category.parent, []);
    }

    parentMap.get(category.parent)?.push({ ...category, subcategories: [] });
  });

  // Recursive builder
  const buildHierarchy = (parentId: string): TCategoryHierarchy[] => {
    return (
      parentMap.get(parentId)?.map((category) => ({
        ...category,
        subcategories: buildHierarchy(category._id),
      })) ?? []
    );
  };

  // Root level categories
  const hierarchy: TCategoryHierarchy[] = allCategories
    .filter((category) => category.level === 1)
    .map((level1) => ({ ...level1, subcategories: buildHierarchy(level1._id) }));

  res.success({ message: 'Categories fetched successfully', data: hierarchy });
};
