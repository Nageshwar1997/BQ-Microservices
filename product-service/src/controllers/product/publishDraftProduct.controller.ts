import { PRODUCT_STATUSES_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TDraftProductDetailsZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';

import { jobProducer, logger, redisCacheManager } from '../../configs/index.js';
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

  // Denormalized stamp for `getProductQueueController`'s "my queue" listing
  // (see the note above `assignedAdminId` in `product.schema.ts`). A
  // cache-miss here is unusual (by the time a USER can even reach this
  // SELLER-only route, their seller application already went through
  // `resolveStateAdmin` in organization-service, which is what populates
  // this cache in the first place) but never blocks the actual product
  // creation - it's a queue-visibility concern, not an approval gate.
  const assignment = await redisCacheManager.assignment.getUserAdmin(user._id.toString());

  if (!assignment) {
    logger.warn(`⚠️ No cached admin assignment for seller-user ${user._id.toString()} while creating a product`);
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

  const payload: TCreateProductPayload = {
    seller: user._id,
    ...(assignment && { assignedAdminId: getObjId(assignment.assignedAdminId) }),
    sku: productSku,

    // Every new product starts PENDING, no exceptions - a SELLER-only route
    // (see `product.routes.ts`), so there's no admin/master shortcut to
    // remove here anymore either.
    status: PRODUCT_STATUSES_MAP.PENDING,

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
        'media-service-queue',
        'mark-multiple-media-as-used',
        { publicIds: uniquePublicIds },
        { attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
      );
    }

    await redisCacheManager.dashboard.deleteDraftProduct(user._id.toString());
  });

  res.success({ statusCode: 201, message: 'Product sent for review', data: product.toObject() });
};
