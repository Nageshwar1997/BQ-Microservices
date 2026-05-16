import type { Request, Response } from 'express';
import { redisCache } from '../../classes';

export const getAllCategories = async (_req: Request, res: Response) => {
  const categories = await redisCache.getAllCategories();

  res.success(200, 'Categories fetched successfully', { categories });
};

export const getCategoriesByParentLevel = async (req: Request, res: Response) => {
  const parentId = req.query.parentId?.toString();
  const level = Number(req.query.level);

  const allCategories = await redisCache.getAllCategories();

  const categories = allCategories.filter((category) => {
    // If level is not provided → return all categories
    if (!level) return true;

    // Level mismatch
    if (category.level !== level) return false;

    // Level 1 → Parent check not required
    if (level === 1) return true;

    // Level 2 & 3 → parent check required
    return category.parent?.toString() === parentId;
  });

  res.success(200, 'Categories fetched successfully', { categories });
};

export const getL1Categories = async (_req: Request, res: Response) => {
  const allCategories = await redisCache.getAllCategories();

  const categories = allCategories.filter((category) => category.level === 1);
  res.success(200, 'Categories fetched successfully', { categories });
};

export const getL2Categories = async (req: Request, res: Response) => {
  const parentId = req.params.parentId as string;

  const allCategories = await redisCache.getAllCategories();

  const categories = allCategories.filter(
    (category) => category.level === 2 && category.parent?.toString() === parentId,
  );
  res.success(200, 'Categories fetched successfully', { categories });
};

export const getL3Categories = async (req: Request, res: Response) => {
  const parentId = req.params.parentId;

  const allCategories = await redisCache.getAllCategories();

  const categories = allCategories.filter(
    (category) => category.level === 3 && category.parent?.toString() === parentId,
  );

  res.success(200, 'Categories fetched successfully', { categories });
};
