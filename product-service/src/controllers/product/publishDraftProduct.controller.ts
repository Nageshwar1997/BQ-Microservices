import type { Request, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { redisCache } from '../../classes';
import { ROLES_MAP } from '../../constants';
import { Product } from '../../models';
import type { TCreateProductPayload } from '../../types';
import { generateSku, generateSlug, getObjId, getUser } from '../../utils';
import type { TDraftProduct } from './saveDraftProduct.controller';

export const publishDraftProductController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const user = getUser(req);
  const draft = req.body as TDraftProduct;

  const productSku = generateSku({
    data: {
      title: draft.basicInfo.title,
      brand: draft.basicInfo.brand,
      l1Cat: draft.basicInfo.l1Category.name,
      l2Cat: draft.basicInfo.l2Category.name,
      l3Cat: draft.basicInfo.l3Category.name,
    },
  });

  const payload: TCreateProductPayload = {
    seller: user._id,
    sku: productSku,
    status: [ROLES_MAP.ADMIN, ROLES_MAP.MASTER].includes(user.role as never)
      ? 'PUBLISHED'
      : 'PENDING',
    ...([ROLES_MAP.ADMIN, ROLES_MAP.MASTER].includes(user.role as never) && {
      history: { approvedAt: new Date(), approvedBy: user._id },
    }),

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

  const product = new Product(payload);

  await product.validate();

  await product.save({ session });

  await redisCache.deleteDraftProduct(user._id.toString());

  res.success(201, 'Product sent for review', { product: product.toObject() });
};
