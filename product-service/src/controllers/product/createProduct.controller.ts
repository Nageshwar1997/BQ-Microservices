import { AppError } from '@beautinique/be-classes';
import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { Product } from '../../models';
import { findOrCreateCategory } from '../../services';
import { generateSlug, getUser } from '../../utils';

export const createProductController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const { _id: sellerId } = getUser(req);

  const {
    title,
    brand,
    originalPrice,
    sellingPrice,
    totalStock,
    description,
    howToUse,
    ingredients,
    additionalDetails,
    images,
    status,
    tryOn,

    categoryL1,
    categoryL2,
    categoryL3,
  } = req.body || {};

  /* ---------------- VALIDATIONS ---------------- */

  if (!title?.trim()) {
    throw new AppError({
      message: 'Title is required',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { title: ['Title is required'] },
    });
  }

  if (!brand?.trim()) {
    throw new AppError({
      message: 'Brand is required',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { brand: ['Brand is required'] },
    });
  }

  if (!description?.trim()) {
    throw new AppError({
      message: 'Description is required',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { description: ['Description is required'] },
    });
  }

  if (!originalPrice || Number(originalPrice) <= 0) {
    throw new AppError({
      message: 'Original price must be greater than zero',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { originalPrice: ['Original price must be greater than zero'] },
    });
  }

  if (!sellingPrice || Number(sellingPrice) <= 0) {
    throw new AppError({
      message: 'Selling price must be greater than zero',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { sellingPrice: ['Selling price must be greater than zero'] },
    });
  }

  if (Number(sellingPrice) > Number(originalPrice)) {
    throw new AppError({
      message: 'Selling price cannot be greater than original price',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { sellingPrice: ['Selling price cannot be greater than original price'] },
    });
  }

  if (totalStock < 0) {
    throw new AppError({
      message: 'Invalid stock quantity',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { totalStock: ['Stock cannot be negative'] },
    });
  }

  /* ---------------- IMAGES VALIDATION ---------------- */

  if (!Array.isArray(images)) {
    throw new AppError({
      message: 'Images must be an array',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { images: ['Images must be an array'] },
    });
  }

  if (images.length > 10) {
    throw new AppError({
      message: 'Maximum 10 images allowed',
      code: 'UNPROCESSABLE_ENTITY',
      fieldErrors: { images: ['Maximum 10 images allowed'] },
    });
  }

  for (const image of images) {
    if (typeof image !== 'string' || !image.trim()) {
      throw new AppError({
        message: 'Invalid image url',
        code: 'UNPROCESSABLE_ENTITY',
        fieldErrors: { images: ['Each image must be a valid url string'] },
      });
    }
  }

  /* ---------------- CATEGORY VALIDATIONS ---------------- */

  if (!categoryL1?.name || !categoryL1?.category) {
    throw new AppError({
      message: 'Category level 1 is required',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  if (!categoryL2?.name || !categoryL2?.category) {
    throw new AppError({
      message: 'Category level 2 is required',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  if (!categoryL3?.name || !categoryL3?.category) {
    throw new AppError({
      message: 'Category level 3 is required',
      code: 'UNPROCESSABLE_ENTITY',
    });
  }

  /* ---------------- FIND / CREATE CATEGORIES ---------------- */

  const category_1 = await findOrCreateCategory({
    level: 1,
    parent: null,
    name: categoryL1.name,
    slug: categoryL1.category,
    session,
  });

  const category_2 = await findOrCreateCategory({
    level: 2,
    parent: category_1._id,
    name: categoryL2.name,
    slug: categoryL2.category,
    session,
  });

  const category_3 = await findOrCreateCategory({
    level: 3,
    parent: category_2._id,
    name: categoryL3.name,
    slug: categoryL3.category,
    session,
  });

  const slug = generateSlug(title);

  /* ---------------- CREATE PRODUCT ---------------- */

  const product = new Product({
    title: title.trim(),
    slug,
    brand: brand.trim(),

    originalPrice: Number(originalPrice),
    sellingPrice: Number(sellingPrice),
    totalStock: Number(totalStock),

    description: description.trim(),
    howToUse: howToUse?.trim() || '',
    ingredients: ingredients?.trim() || '',
    additionalDetails: additionalDetails?.trim() || '',

    images,

    category: category_3._id,
    seller: sellerId,

    status: status || 'DRAFT',

    tryOn: {
      enabled: tryOn?.enabled || false,
      category: tryOn?.category,
      type: tryOn?.type,
    },
  });
  await product.save({ session });

  res.success(201, 'Product created successfully', { product });
};
