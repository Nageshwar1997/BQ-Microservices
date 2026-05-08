import type { NextFunction, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { findOrCreateCategory } from '../services';
import type { AuthRequest } from '../types';

export const createProductController = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const { categoryL1, categoryL2, categoryL3 } = req.body || {};

  // Find or Create Level-Two Category (Parent must be null)
  const category_1 = await findOrCreateCategory({
    level: 1,
    parent: null,
    name: categoryL1.name,
    value: categoryL1.category,
    session,
  });

  // Find or Create Level-Two Category (Parent must be Level-One)
  const category_2 = await findOrCreateCategory({
    level: 2,
    parent: category_1._id,
    name: categoryL2.name,
    value: categoryL2.category,
    session,
  });

  // Find or Create Level-Three Category (Parent must be Level-Two)
  const category_3 = await findOrCreateCategory({
    level: 3,
    parent: category_2._id,
    name: categoryL3.name,
    value: categoryL3.category,
    session,
  });

  res.success(200, 'Product created successfully', { category_1, category_2, category_3 });
};
