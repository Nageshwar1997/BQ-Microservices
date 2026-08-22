import { ConflictError, NotFoundError } from '@beautinique/backend-classes';
import { PRODUCT_STATUSES_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TUpdateProductApprovalStatusZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { Product } from '../../models/index.js';

/**
 * Mirrors `organization-service`'s `updateSellerApprovalStatusController` -
 * same shape (one PATCH endpoint, body decides approve vs reject), gated by
 * `authorize()` (role) + `authorizeProductOwnership` (which admin) upstream
 * in the route.
 */
export const updateProductApprovalStatusController = async (req: Request, res: Response) => {
  const admin = getUser(req.user);

  const { productId } = req.params as { productId: string };
  const body = req.body as TUpdateProductApprovalStatusZodSchema;

  const product = await Product.findById(getObjId(productId));

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.status !== PRODUCT_STATUSES_MAP.PENDING) {
    throw new ConflictError(`Product has already been ${product.status.toLowerCase()}`);
  }

  product.history ??= {};

  if (body.status === PRODUCT_STATUSES_MAP.PUBLISHED) {
    product.status = PRODUCT_STATUSES_MAP.PUBLISHED;
    product.history.approvedBy = admin._id;
    product.history.approvedAt = new Date();
  } else {
    product.status = PRODUCT_STATUSES_MAP.REJECTED;
    product.history.rejectedBy = admin._id;
    product.history.rejectedAt = new Date();
    product.history.rejectReason = body.rejectReason;
  }

  const updatedProduct = await product.save();

  res.success({ message: 'Product review updated successfully', data: updatedProduct });
};
