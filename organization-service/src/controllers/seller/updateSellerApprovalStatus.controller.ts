import { ConflictError, NotFoundError } from '@beautinique/backend-classes';
import { SELLER_APPROVAL_STATUS_MAP, USER_ROLE_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TUpdateSellerApprovalStatusZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { jobProducer, redisCacheManager } from '../../configs/index.js';
import { Seller } from '../../models/index.js';

/**
 * Admin reviews a `PENDING` seller application. Approving it is the only
 * thing that promotes the target user's role (`USER -> SELLER`) - the role
 * flip itself happens over `user-service-queue`'s `update-role` job (worked
 * off by `user-service`'s `WorkerManager`), not a direct HTTP call.
 * `approvalStatus` only flips once the job is actually queued - a Redis
 * hiccup here means the seller stays `PENDING` instead of silently drifting
 * out of sync with the user's real role.
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
    await jobProducer.addJob('user-service-queue', 'update-role', {
      userId: seller.user.toString(),
      role: USER_ROLE_MAP.SELLER,
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
