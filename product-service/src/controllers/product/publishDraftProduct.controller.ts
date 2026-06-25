import { bullQueue } from '@beautinique/be-jobs';
import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { redisCache } from '../../classes';
import { ROLES_MAP } from '../../constants';
import { Product } from '../../models';
import type { TCreateProductPayload } from '../../types';
import {
  extractImageUrlsFromHtml,
  generateSku,
  generateSlug,
  getCloudinaryPublicIdFromUrl,
  getObjId,
  getUser,
} from '../../utils';
import type { TDraftProduct } from './saveDraftProduct.controller';

export const publishDraftProductController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const user = getUser(req);
  const draft = req.body as TDraftProduct;

  const isAdmin = [ROLES_MAP.ADMIN, ROLES_MAP.MASTER].includes(user.role as never);

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

    status: isAdmin ? 'PUBLISHED' : 'PENDING',

    ...(isAdmin && { history: { approvedAt: new Date(), approvedBy: user._id } }),

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
        ? draft.stockAndVariants.variants.map((variant) => ({
            ...variant,
            sku: generateSku({ data: { label: variant.label }, prefix: productSku }),
          }))
        : [],

    stock: 'stock' in draft.stockAndVariants ? draft.stockAndVariants.stock : null,

    stockThreshold:
      'stockThreshold' in draft.stockAndVariants ? draft.stockAndVariants.stockThreshold : null,

    // TRY-ON CONFIGURATION
    tryOn:
      'tryOn' in draft.tryOnConfiguration
        ? {
            enabled: true,
            configured: true,
            category: draft.tryOnConfiguration.tryOn.category,
            subCategory: draft.tryOnConfiguration.tryOn.subCategory as never,
          }
        : { enabled: false, configured: false },
  };

  const product = new Product(payload);

  await product.validate();

  await product.save({ session });

  const publicIds = [
    ...product.images,

    product.thumbnail,

    product.video,

    ...(product.hasVariants
      ? product.variants.flatMap((variant) => [...variant.images, variant.thumbnail])
      : []),

    ...extractImageUrlsFromHtml(product.description),

    ...(product.ingredients ? extractImageUrlsFromHtml(product.ingredients) : []),

    ...(product.instructions ? extractImageUrlsFromHtml(product.instructions) : []),

    ...(product.additional ? extractImageUrlsFromHtml(product.additional) : []),
  ]
    .filter((url): url is string => Boolean(url))
    .map(getCloudinaryPublicIdFromUrl)
    .filter((id): id is string => Boolean(id));

  const uniquePublicIds = [...new Set(publicIds)];

  res.locals.afterCommit?.push(async () => {
    if (uniquePublicIds.length > 0) {
      await bullQueue.addJob({
        queueName: 'media-queue',
        jobName: 'mark-multiple-media-as-used',
        data: { publicIds: uniquePublicIds },
        options: { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
      });
    }

    await redisCache.dashboard.deleteDraftProduct(user._id.toString());
  });

  res.success(201, 'Product sent for review', { product: product.toObject() });
};
