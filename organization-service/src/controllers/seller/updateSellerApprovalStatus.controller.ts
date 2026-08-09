import { ConflictError, NotFoundError } from '@beautinique/backend-classes';
import { SELLER_APPROVAL_STATUS_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TUpdateSellerApprovalStatusZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { UserServiceApi } from '../../classes/index.js';
import { redisCacheManager } from '../../configs/index.js';
import { Seller } from '../../models/index.js';

const userServiceApi = new UserServiceApi();

/**
 * Admin reviews a `PENDING` seller application. Approving it is the only
 * thing that promotes the target user's role (`USER -> SELLER`) - the role
 * sync is called first, and the local `approvalStatus` only flips once it
 * actually succeeds, so a failed sync never leaves a seller marked
 * `APPROVED` while the user is still `USER`.
 */
export const updateSellerApprovalStatusController = async (req: Request, res: Response) => {
  const admin = getUser(req.user);

  const { sellerId } = req.params as { sellerId: string };
  const body = req.body as TUpdateSellerApprovalStatusZodSchema;

  const seller = await Seller.findById(getObjId(sellerId));

  if (!seller) {
    throw new NotFoundError('Seller not found');
  }

  if (seller.approvalStatus !== SELLER_APPROVAL_STATUS_MAP.PENDING) {
    throw new ConflictError(
      `Seller application has already been ${seller.approvalStatus.toLowerCase()}`,
    );
  }

  seller.history ??= {};

  if (body.approvalStatus === SELLER_APPROVAL_STATUS_MAP.APPROVED) {
    // user-service owns the User document - only flip local status once the
    // role sync actually succeeds.
    await userServiceApi.promoteToSeller(seller.user.toString(), {
      _id: admin._id.toString(),
      role: admin.role,
    });

    seller.approvalStatus = SELLER_APPROVAL_STATUS_MAP.APPROVED;
    seller.history.approvedBy = admin._id;
    seller.history.approvedAt = new Date();
  } else {
    seller.approvalStatus = SELLER_APPROVAL_STATUS_MAP.REJECTED;
    seller.history.rejectedBy = admin._id;
    seller.history.rejectedAt = new Date();
    seller.history.rejectReason = body.rejectReason;
  }

  const updatedSeller = await seller.save();

  await redisCacheManager.seller.setSeller(updatedSeller._id.toString(), updatedSeller.toObject());

  res.success({ message: 'Seller application updated successfully', data: updatedSeller });
};
