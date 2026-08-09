import { ConflictError } from '@beautinique/backend-classes';
import { SELLER_APPROVAL_STATUS_MAP } from '@beautinique/backend-constants';
import type { TDraftSellerDetailsZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';

import { redisCacheManager } from '../../configs/index.js';
import { Seller } from '../../models/index.js';

// Avoids pulling in `mongodb` just for this - a duplicate-key write error
// always carries a numeric `code: 11000`.
const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

/**
 * Reassembled by `createPendingSellerPayload` from the applicant's own
 * redis draft (see `saveDraftSellerController`) - mirrors
 * `publishDraftProductController`'s draft -> pending-document flow.
 */
export const createSellerController = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  session: ClientSession,
) => {
  const user = getUser(req.user);
  const draft = req.body as TDraftSellerDetailsZodSchema;

  /* ---------------- DUPLICATE CHECKS (pre-check - the unique indexes on `seller.schema.ts` are the backstop) ---------------- */

  const [existingSellerProfile, duplicateSeller] = await Promise.all([
    Seller.findOne({ user: user._id }).select('_id').session(session).lean().exec(),
    Seller.findOne({
      $or: [
        { 'businessDetails.email': draft.businessDetails.businessEmail },
        { 'businessDetails.phoneNumber': draft.businessDetails.businessPhoneNumber },
        { 'businessDetails.gstin': draft.businessDetails.gstin },
        { 'businessDetails.pan': draft.businessDetails.pan },
        { 'bankDetails.accountNumber': draft.bankDetails.accountNumber },
      ],
    })
      .select('businessDetails bankDetails')
      .session(session)
      .lean()
      .exec(),
  ]);

  if (existingSellerProfile) {
    throw new ConflictError('You already have a seller application');
  }

  if (duplicateSeller) {
    const fieldErrors: Record<string, string[]> = {};

    if (duplicateSeller.businessDetails.email === draft.businessDetails.businessEmail) {
      fieldErrors.businessEmail = ['Business email is already in use'];
    }
    if (duplicateSeller.businessDetails.phoneNumber === draft.businessDetails.businessPhoneNumber) {
      fieldErrors.businessPhoneNumber = ['Business phone number is already in use'];
    }
    if (duplicateSeller.businessDetails.gstin === draft.businessDetails.gstin) {
      fieldErrors.gstin = ['GSTIN is already in use'];
    }
    if (duplicateSeller.businessDetails.pan === draft.businessDetails.pan) {
      fieldErrors.pan = ['PAN is already in use'];
    }
    if (duplicateSeller.bankDetails.accountNumber === draft.bankDetails.accountNumber) {
      fieldErrors.accountNumber = ['Bank account number is already in use'];
    }

    throw new ConflictError('One or more seller details are already in use', { fieldErrors });
  }

  /* ---------------- CREATE (PENDING - the user's role is NOT touched here) ---------------- */
  const seller = new Seller({
    user: user._id,
    businessDetails: {
      name: draft.businessDetails.businessName,
      type: draft.businessDetails.businessType,
      email: draft.businessDetails.businessEmail,
      phoneNumber: draft.businessDetails.businessPhoneNumber,
      gstin: draft.businessDetails.gstin,
      pan: draft.businessDetails.pan,
    },
    bankDetails: {
      accountHolderName: draft.bankDetails.accountHolderName,
      accountNumber: draft.bankDetails.accountNumber,
      ifscCode: draft.bankDetails.ifscCode,
      bankName: draft.bankDetails.bankName,
    },
    address: {
      line1: draft.address.line1,
      line2: draft.address.line2,
      city: draft.address.city,
      state: draft.address.state,
      pincode: draft.address.pincode,
      country: draft.address.country,
    },
    documents: {
      id: draft.documents.id,
      address: draft.documents.address,
      license: draft.documents.license,
      pan: draft.documents.pan,
      gst: draft.documents.gst,
      bank: draft.documents.bank,
    },
    approvalStatus: SELLER_APPROVAL_STATUS_MAP.PENDING,
  });

  try {
    await seller.validate();

    await seller.save({ session });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ConflictError('One or more seller details are already in use');
    }

    throw error;
  }

  res.locals.afterCommit?.push(async () => {
    await redisCacheManager.seller.setSeller(seller._id.toString(), seller.toObject());
    await redisCacheManager.seller.deleteDraftSeller(user._id.toString());
  });

  res.success({
    statusCode: 201,
    message: 'Seller application submitted - pending admin approval',
    data: seller.toObject(),
  });
};
