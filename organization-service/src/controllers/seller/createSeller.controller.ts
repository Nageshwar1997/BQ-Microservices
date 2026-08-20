import { ConflictError } from '@beautinique/backend-classes';
import {
  SELLER_APPROVAL_STATUS_MAP,
  TERRITORY_ASSIGNMENT_REASON_MAP,
} from '@beautinique/backend-constants';
import type { TDraftSellerDetailsZodSchema } from '@beautinique/backend-types';
import { getUser } from '@beautinique/backend-utils';
import type { NextFunction, Request, Response } from 'express';
import type { ClientSession } from 'mongoose';

import { jobProducer, logger, redisCacheManager } from '../../configs/index.js';
import { Seller } from '../../models/index.js';
import { resolveStateAdmin, verifyStateFromPincode } from '../../utils/index.js';

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

  // Sequential, not `Promise.all` - both queries share `session`, and a
  // MongoDB session can only have one operation in flight at a time inside a
  // transaction. Running them concurrently throws "Only servers in a sharded
  // cluster can start a new transaction at the active transaction number"
  // (discovered live-testing the real submit flow end-to-end for the first
  // time - the duplicate-check path had never actually been exercised over
  // HTTP before, only via direct-insert scratch scripts).
  const existingSellerProfile = await Seller.findOne({ user: user._id })
    .select('_id')
    .session(session)
    .lean()
    .exec();

  const duplicateSeller = await Seller.findOne({
    $or: [
      { 'businessDetails.email': draft.businessDetails.email },
      { 'businessDetails.phoneNumber': draft.businessDetails.phoneNumber },
      { 'businessDetails.gstin': draft.businessDetails.gstin },
      { 'businessDetails.pan': draft.businessDetails.pan },
      { 'bankDetails.accountNumber': draft.bankDetails.accountNumber },
    ],
  })
    .select('businessDetails bankDetails')
    .session(session)
    .lean()
    .exec();

  if (existingSellerProfile) {
    throw new ConflictError('You already have a seller application');
  }

  if (duplicateSeller) {
    const fieldErrors: Record<string, string[]> = {};

    if (duplicateSeller.businessDetails.email === draft.businessDetails.email) {
      fieldErrors.email = ['Business email is already in use'];
    }
    if (duplicateSeller.businessDetails.phoneNumber === draft.businessDetails.phoneNumber) {
      fieldErrors.phoneNumber = ['Business phone number is already in use'];
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

  /* ---------------- STATE -> ADMIN RESOLUTION (shadow mode - see task 2.5) ---------------- */

  // Best-effort: a resolution failure (user-service down, no admin
  // configured for the state yet) must never block seller onboarding -
  // `assignedAdmin` just stays `null` ("needs manual assignment") instead.
  // Ownership isn't enforced anywhere yet (that's Phase 3), so this is
  // purely additive right now.
  let resolvedAdmin: Awaited<ReturnType<typeof resolveStateAdmin>> = null;

  try {
    resolvedAdmin = await resolveStateAdmin(draft.address.state);
  } catch (error) {
    logger.warn(error, `⚠️ Failed to resolve admin for state ${draft.address.state}`);
  }

  /* ---------------- PINCODE/STATE CROSS-CHECK (best-effort, never blocks - see util's doc comment) ---------------- */

  // `false` = confirmed mismatch (a real signal); `true` = matched *or*
  // "couldn't verify" (API down/no key/unrecognized pincode) - never treated
  // as suspicious, only a genuine mismatch flips the assignment reason below.
  const stateMatchesPincode = await verifyStateFromPincode(
    draft.address.pincode,
    draft.address.state,
  );

  if (!stateMatchesPincode) {
    logger.warn(
      `⚠️ Seller address state/pincode mismatch for ${draft.businessDetails.name} - state ${draft.address.state}, pincode ${draft.address.pincode}`,
    );
  }

  /* ---------------- CREATE (PENDING - the user's role is NOT touched here) ---------------- */
  const seller = new Seller({
    user: user._id,
    businessDetails: {
      name: draft.businessDetails.name,
      type: draft.businessDetails.type,
      email: draft.businessDetails.email,
      phoneNumber: draft.businessDetails.phoneNumber,
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
    ...(resolvedAdmin && {
      assignedAdmin: resolvedAdmin.adminUserId,
      assignedAdminHistory: [
        {
          admin: resolvedAdmin.adminUserId,
          assignedAt: new Date(),
          // A confirmed pincode/state mismatch overrides the normal resolution
          // reason so it stands out in the audit trail as needing MASTER's
          // attention - the assignment itself still goes through normally,
          // this only flags it (assignment plan doc, section 5.5).
          reason: stateMatchesPincode
            ? resolvedAdmin.reason
            : TERRITORY_ASSIGNMENT_REASON_MAP.MANUAL_REASSIGN,
        },
      ],
      assignedViaSuperAdminPool:
        resolvedAdmin.reason === TERRITORY_ASSIGNMENT_REASON_MAP.SUPER_ADMIN_POOL,
    }),
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

    if (resolvedAdmin) {
      await jobProducer.addJob('product-service-queue', 'seller-admin-assigned', {
        userId: user._id.toString(),
        sellerId: seller._id.toString(),
        assignedAdminId: resolvedAdmin.adminUserId,
        state: draft.address.state,
        reason: resolvedAdmin.reason,
      });

      await jobProducer.addJob('mail-service-queue', 'send-seller-assigned-notification', {
        to: resolvedAdmin.adminEmail,
        subject: `New seller application - ${draft.businessDetails.name}`,
        data: {
          sellerBusinessName: draft.businessDetails.name,
          state: draft.address.state,
        },
      });
    }
  });

  res.success({
    statusCode: 201,
    message: 'Seller application submitted - pending admin approval',
    data: seller.toObject(),
  });
};
