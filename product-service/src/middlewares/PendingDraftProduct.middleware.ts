import { AppError } from '@beautinique/be-classes';
import type { NextFunction, Request, Response } from 'express';
import { redisCache } from '../classes';
import type { TCreateProductPayload } from '../types';
import { generateSku, generateSlug, getObjId, getUser } from '../utils';

export const pendingDraftProduct = async (req: Request, _res: Response, next: NextFunction) => {
  const user = getUser(req);
  const draft = await redisCache.getDraftProduct(user._id.toString());

  if (!draft) {
    throw new AppError({ message: 'Draft expired', code: 'NOT_FOUND' });
  }

  if (!draft.basicInfo) {
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

  const productSku = generateSku({
    data: {
      title: draft.basicInfo.title,
      brand: draft.basicInfo.brand,
      l1Cat: draft.basicInfo.l1Category.name,
      l2Cat: draft.basicInfo.l2Category.name,
      l3Cat: draft.basicInfo.l3Category.name,
    },
  });

  const body: TCreateProductPayload = {
    seller: user._id,
    sku: productSku,

    // BASIC INFO
    title: draft.basicInfo.title,
    brand: draft.basicInfo.brand,
    originalPrice: draft.basicInfo.originalPrice,
    sellingPrice: draft.basicInfo.sellingPrice,
    category: getObjId(draft.basicInfo.l3Category.id),
    slug: generateSlug(`${draft.basicInfo.title} ${draft.basicInfo.l3Category.name}`),

    // DESCRIPTION AND CONTENT
    shortDescription: draft.descriptionAndContent.shortDescription,
    description: draft.descriptionAndContent.description,
    ingredients: draft.descriptionAndContent.ingredients,
    instructions: draft.descriptionAndContent.instructions,
    additional: draft.descriptionAndContent.additional,

    // MEDIA AND GALLERY
    thumbnail: draft.mediaAndGallery.thumbnail,
    images: draft.mediaAndGallery.images,
    video: draft.mediaAndGallery.video,

    // STOCK AND VARIANTS
    hasVariants: draft.stockAndVariants.hasVariants,
    variants:
      'variants' in draft.stockAndVariants
        ? draft.stockAndVariants.variants.map((v) => ({
            ...v,
            sku: generateSku({ data: { label: v.label }, prefix: productSku, unique: false }),
          }))
        : [],
    stock: 'stock' in draft.stockAndVariants ? draft.stockAndVariants.stock : 0,
    stockThreshold:
      'stockThreshold' in draft.stockAndVariants ? draft.stockAndVariants.stockThreshold : 0,
    // TRYON CONFIGURATION
    tryOn:
      'tryon' in draft.tryOnConfiguration
        ? {
            enabled: true,
            configured: true,
            category: draft.tryOnConfiguration.tryon.category,
            subCategory: draft.tryOnConfiguration.tryon.subCategory as never,
          }
        : { enabled: false, configured: false },
  };

  req.body = body;
  next();
};
