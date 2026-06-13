import { AppError } from '@beautinique/be-classes';
import type { NextFunction, Request, Response } from 'express';
import { redisCache } from '../classes';
import type { TProduct } from '../types';
import { generateSlug, getObjId, getUser } from '../utils';

export const pendingDraftProduct = async (req: Request, res: Response, next: NextFunction) => {
  const user = getUser(req);
  const draft = await redisCache.getDraftProduct(user._id.toString());

  if (!draft) {
    throw new AppError({ message: 'Draft expired', code: 'NOT_FOUND' });
  }

  if (!draft?.basicInfo) {
    throw new AppError({ message: 'Basic info is missing', code: 'PRECONDITION_FAILED' });
  }

  if (!draft.descriptionAndContent) {
    throw new AppError({
      message: 'Description and content is missing',
      code: 'PRECONDITION_FAILED',
    });
  }

  if (!draft.stockAndVariants) {
    throw new AppError({
      message: 'Stock and variants configuration is missing',
      code: 'PRECONDITION_FAILED',
    });
  }

  if (!draft.mediaAndGallery) {
    throw new AppError({
      message: 'Product media is missing',
      code: 'PRECONDITION_FAILED',
    });
  }

  if (!draft.tryOnConfiguration) {
    throw new AppError({
      message: 'Try-on configuration is missing',
      code: 'PRECONDITION_FAILED',
    });
  }
  const body: TProduct = {
    seller: user._id,

    // BASIC INFO
    title: draft.basicInfo.title,
    brand: draft.basicInfo.brand,
    originalPrice: draft.basicInfo.originalPrice,
    sellingPrice: draft.basicInfo.sellingPrice,
    category: getObjId(draft.basicInfo.l3Category.id),
    slug: generateSlug(`${draft.basicInfo.title} ${draft.basicInfo.l3Category.name}`),

    // DESCRIPTION AND CONTENT
    description: draft.descriptionAndContent.shortDescription,
    content: {
      description: draft.descriptionAndContent.description,
      ingredients: draft.descriptionAndContent.ingredients,
      instructions: draft.descriptionAndContent.instructions,
      other: draft.descriptionAndContent.additional,
    },

    // MEDIA AND GALLERY
    thumbnail: draft.mediaAndGallery.thumbnail,
    images: draft.mediaAndGallery.images,
    video: draft.mediaAndGallery.video,

    // STOCK AND VARIANTS
    hasVariants: draft.stockAndVariants.hasVariants,
    variants: 'variants' in draft.stockAndVariants ? draft.stockAndVariants.variants : [],
    stock: 'stock' in draft.stockAndVariants ? draft.stockAndVariants.stock : 0,
    stockThreshold:
      'stockThreshold' in draft.stockAndVariants ? draft.stockAndVariants.stockThreshold : 0,

    status: 'PENDING',
    tryOn: {
      enabled: draft.tryOnConfiguration.enabled,
      configured: 'tryon' in draft.tryOnConfiguration,
      ...('tryon' in draft.tryOnConfiguration && {
        category: draft.tryOnConfiguration.tryon.type,
        subCategory: draft.tryOnConfiguration.tryon.subType,
      }),
    },
  };

  req.body = body;
  next();
};
