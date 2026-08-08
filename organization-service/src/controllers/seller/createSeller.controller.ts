import { ConflictError } from '@beautinique/backend-classes';
import { getObjId } from '@beautinique/backend-mongoose';
import { getUser } from '@beautinique/backend-utils';
import type { Request, Response } from 'express';

import { UserServiceApi } from '../../classes/index.js';
import { redisCacheManager } from '../../configs/index.js';
import { Seller } from '../../models/index.js';
import type { TCreateSellerZodSchema } from '../../types/index.js';

const userServiceApi = new UserServiceApi();

// Avoids pulling in `mongodb` just for this - a duplicate-key write error
// always carries a numeric `code: 11000`.
const isDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

export const createSellerController = async (req: Request, res: Response) => {
  const admin = getUser(req.user);

  const { userId, businessDetails, bankDetails, address, documents } =
    req.body as TCreateSellerZodSchema;

  const targetUserId = getObjId(userId);

  /* ---------------- DUPLICATE CHECKS (pre-check - the unique indexes on `seller.schema.ts` are the backstop) ---------------- */

  const [existingSellerProfile, duplicateSeller] = await Promise.all([
    Seller.findOne({ user: targetUserId }).select('_id').lean(),
    Seller.findOne({
      $or: [
        { 'businessDetails.email': businessDetails.businessEmail },
        { 'businessDetails.phoneNumber': businessDetails.businessPhoneNumber },
        { 'businessDetails.gstin': businessDetails.gstin },
        { 'businessDetails.pan': businessDetails.pan },
        { 'bankDetails.accountNumber': bankDetails.accountNumber },
      ],
    })
      .select('businessDetails bankDetails')
      .lean(),
  ]);

  if (existingSellerProfile) {
    throw new ConflictError('This user already has a seller profile');
  }

  if (duplicateSeller) {
    const fieldErrors: Record<string, string[]> = {};

    if (duplicateSeller.businessDetails.email === businessDetails.businessEmail) {
      fieldErrors.businessEmail = ['Business email is already in use'];
    }
    if (duplicateSeller.businessDetails.phoneNumber === businessDetails.businessPhoneNumber) {
      fieldErrors.businessPhoneNumber = ['Business phone number is already in use'];
    }
    if (duplicateSeller.businessDetails.gstin === businessDetails.gstin) {
      fieldErrors.gstin = ['GSTIN is already in use'];
    }
    if (duplicateSeller.businessDetails.pan === businessDetails.pan) {
      fieldErrors.pan = ['PAN is already in use'];
    }
    if (duplicateSeller.bankDetails.accountNumber === bankDetails.accountNumber) {
      fieldErrors.accountNumber = ['Bank account number is already in use'];
    }

    throw new ConflictError('One or more seller details are already in use', { fieldErrors });
  }

  /* ---------------- CREATE SELLER (organization-service's own data first) ---------------- */

  let seller;

  try {
    seller = await Seller.create({
      user: targetUserId,
      businessDetails: {
        name: businessDetails.businessName,
        type: businessDetails.businessType,
        email: businessDetails.businessEmail,
        phoneNumber: businessDetails.businessPhoneNumber,
        gstin: businessDetails.gstin,
        pan: businessDetails.pan,
      },
      bankDetails,
      address,
      documents,
      createdBy: admin._id,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ConflictError('One or more seller details are already in use');
    }

    throw error;
  }

  /* ---------------- PROMOTE USER ROLE (user-service owns the User document) ---------------- */

  try {
    await userServiceApi.promoteToSeller(userId, {
      _id: admin._id.toString(),
      role: admin.role,
    });
  } catch (error) {
    // Only valid once the role sync succeeds - don't leave a half-done
    // Seller profile behind for a user who is still `USER`.
    await Seller.findByIdAndDelete(seller._id);

    throw error;
  }

  /* ---------------- REDIS ---------------- */

  await redisCacheManager.seller.setSeller(seller._id.toString(), seller.toObject());

  res.success({ statusCode: 201, message: 'Seller created successfully', data: seller });
};
