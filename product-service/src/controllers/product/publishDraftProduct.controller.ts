import { getObjId } from '@beautinique/backend-mongoose';
import type { TDraftProductDetailsZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import { PRODUCT_STATUSES_MAP, USER_ROLE_MAP } from '@beautinique/shared-constants';
import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';

import { jobProducer, redisCacheManager } from '../../configs/index.js';
import { Product } from '../../models/index.js';
import type { TCreateProductPayload } from '../../types/index.js';
import {
  extractImageUrlsFromHtml,
  generateSku,
  generateSlug,
  getCloudinaryPublicIdFromUrl,
} from '../../utils/index.js';

export const publishDraftProductController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const user = getUser(req.user);
  const draft = req.body as TDraftProductDetailsZodSchema;

  const isAdmin = [USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER].includes(user.role as never);

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

    status: isAdmin ? PRODUCT_STATUSES_MAP.PUBLISHED : PRODUCT_STATUSES_MAP.PENDING,

    ...(isAdmin && { history: { approvedAt: new Date(), approvedBy: user._id } }),

    // BASIC INFO
    title: draft.basicInfo.title,
    brand: draft.basicInfo.brand,
    originalPrice: draft.basicInfo.originalPrice,
    sellingPrice: draft.basicInfo.sellingPrice,
    category: getObjId(draft.basicInfo.l3Category._id),
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
    tryOn: {
      enabled: draft.tryOnConfiguration.enabled,
      configured: Boolean(draft.tryOnConfiguration.tryOn),
      category: draft.tryOnConfiguration.tryOn?.category,
      subCategory: draft.tryOnConfiguration.tryOn?.subCategory,
    } as TCreateProductPayload['tryOn'],
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
      await jobProducer.addJob(
        'media-queue',
        'mark-multiple-media-as-used',
        { publicIds: uniquePublicIds },
        { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
      );
    }

    await redisCacheManager.dashboard.deleteDraftProduct(user._id.toString());
  });

  res.success({ statusCode: 201, message: 'Product sent for review', data: product.toObject() });
};
