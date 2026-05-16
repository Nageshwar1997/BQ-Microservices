import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import type { ClientSession } from 'mongoose';
import { VARIANT_STATUS_MAP } from '../../constants';
import { Variant } from '../../models';
import type { TVariant } from '../../types';
import { getUser, isNullOrUndefined } from '../../utils';

export const createVariantController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const user = getUser(req);

  const { title, productId, stock, images, type, price } = req.body;

  /* ---------------- CHECK EXISTING VARIANT ---------------- */

  const existingVariant = await Variant.findOne({
    productId,
    title,
    ...(type?.color && { 'type.color': type.color }),
    ...(type?.text && { 'type.text': type.text }),
  })
    .select('_id')
    .lean()
    .session(session);

  if (existingVariant) {
    throw new AppError({ message: 'Variant already exists for this product', code: 'CONFLICT' });
  }

  /* ---------------- CREATE VARIANT ---------------- */

  const hasType = type && (type?.color || type?.text);
  const hasPrice =
    price && (!isNullOrUndefined(price?.selling) || !isNullOrUndefined(price?.original));
  const variant = new Variant<TVariant>({
    title: title,
    productId,
    stock,
    images,
    createdByRole: user.role,
    ...(hasType && { type }),
    ...(hasPrice && { price: { selling: price?.selling, original: price?.original } }),
    ...(user.role === 'SELLER' && { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
    ...(user.role !== 'SELLER' && { status: VARIANT_STATUS_MAP.USED }),
  });

  try {
    await variant.save({ session });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new AppError({ message: 'Variant already exists', code: 'CONFLICT' });
    }
    throw error;
  }

  return res.success(201, 'Variant created successfully', { variant });
};
