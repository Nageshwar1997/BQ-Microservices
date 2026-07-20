import type { TCategoryLevel } from '@beautinique/backend-types';
import { CATEGORY_LEVELS_MAP } from '@beautinique/shared-constants';
import type { Request, Response } from 'express';

import { redisCacheManager } from '../../configs/index.js';
import type { TCategoryHierarchy } from '../../types/index.js';

export const getCategoriesByParentLevelController = async (req: Request, res: Response) => {
  const parentId = req.query.parent as string;
  const level = Number(req.query.level) as TCategoryLevel | undefined;

  const allCategories = await redisCacheManager.category.getAllCategories();

  const categories = allCategories.filter((category) => {
    // If level is not provided → return all categories
    if (!level) return true;

    // Level mismatch
    if (category.level !== level) return false;

    // Level 1 → Parent check not required
    if (level === CATEGORY_LEVELS_MAP.L1) return true;

    // Level 2 & 3 → parent check required
    return 'parent' in category && category.parent === parentId;
  });

  res.success({ message: 'Categories fetched successfully', data: categories });
};

export const getCategoriesByHierarchyController = async (_req: Request, res: Response) => {
  const allCategories = await redisCacheManager.category.getAllCategories();

  // Parent wise map
  const parentMap = new Map<string, TCategoryHierarchy[]>();

  // Prepare map
  allCategories.forEach((category) => {
    if (!('parent' in category)) return;

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
    .filter((category) => category.level === CATEGORY_LEVELS_MAP.L1)
    .map((level1) => ({ ...level1, subcategories: buildHierarchy(level1._id) }));

  res.success({ message: 'Categories fetched successfully', data: hierarchy });
};
