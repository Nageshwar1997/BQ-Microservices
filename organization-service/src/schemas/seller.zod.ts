// These aren't in `@beautinique/backend-zod` yet - this repo can't bump that
// shared package on its own (see SELLER_FEATURE_PLAN.md), so the seller
// onboarding wizard's schemas live here for now, following the same
// `xZodSchema` naming convention used everywhere else.

import { COUNTRIES, REGEX, SELLER_TYPES, STATES_AND_UTS } from '@beautinique/backend-constants';
import {
  emailValidation,
  imageUrlValidation,
  literal,
  object,
  phoneNumberValidation,
  string,
  z,
} from '@beautinique/backend-zod';

import {
  BANK_ACCOUNT_NUMBER_REGEX,
  DRAFT_SELLER_STEP_MAP,
  IFSC_REGEX,
} from '../constants/index.js';

/* -------------------------------------------------------------------------- */
/*                    SELF-SERVICE ONBOARDING WIZARD STEPS                    */
/* -------------------------------------------------------------------------- */

export const sellerBusinessDetailsZodSchema = object({
  step: literal(DRAFT_SELLER_STEP_MAP[0]),
  businessName: string('Business name is required')
    .nonempty('Business name is required')
    .trim()
    .min(2, 'Business name must be at least 2 characters long'),
  businessType: z.enum(SELLER_TYPES, 'Business type is required'),
  businessEmail: emailValidation,
  businessPhoneNumber: phoneNumberValidation,
  gstin: string('GSTIN is required')
    .trim()
    .nonempty('GSTIN is required')
    .toUpperCase()
    .regex(REGEX.GST, 'Enter a valid GSTIN'),
  pan: string('PAN is required')
    .trim()
    .nonempty('PAN is required')
    .toUpperCase()
    .regex(REGEX.PAN, 'Enter a valid PAN'),
});

export const sellerBankDetailsZodSchema = object({
  step: literal(DRAFT_SELLER_STEP_MAP[1]),
  accountHolderName: string('Account holder name is required')
    .trim()
    .nonempty('Account holder name is required'),
  accountNumber: string('Account number is required')
    .trim()
    .nonempty('Account number is required')
    .min(9, 'Enter valid account number')
    .max(18, 'Enter valid account number')
    .regex(BANK_ACCOUNT_NUMBER_REGEX, 'Enter a valid account number'),
  ifscCode: string('IFSC code is required')
    .trim()
    .nonempty('IFSC code is required')
    .toUpperCase()
    .regex(IFSC_REGEX, 'Enter a valid IFSC code'),
  bankName: string('Bank name is required').trim().nonempty('Bank name is required'),
});

export const sellerAddressZodSchema = object({
  step: literal(DRAFT_SELLER_STEP_MAP[2]),
  line1: string('Address line 1 is required').trim().nonempty('Address line 1 is required'),
  line2: string('Address line 2 (optional)').trim().optional(),
  city: string('City is required').trim().nonempty('City is required'),
  state: z.enum(STATES_AND_UTS, 'State is required'),
  pincode: string('Pincode is required')
    .trim()
    .nonempty('Pincode is required')
    .min(6, 'Enter valid pincode')
    .max(6, 'Enter valid pincode')
    .regex(REGEX.PIN_CODE, 'Enter a valid 6-digit pincode'),
  country: z.enum(COUNTRIES, 'Country is required'),
});

export const sellerDocumentsFormZodSchema = object({
  step: literal(DRAFT_SELLER_STEP_MAP[3]),
  id: imageUrlValidation,
  address: imageUrlValidation,
  license: imageUrlValidation,
  pan: imageUrlValidation,
  gst: imageUrlValidation,
  bank: imageUrlValidation,
});

/**
 * Body of a single "save draft step" call - whichever step the self-service
 * wizard is currently on.
 */
export const sellerDraftStepBodyZodSchema = sellerBusinessDetailsZodSchema
  .or(sellerBankDetailsZodSchema)
  .or(sellerAddressZodSchema)
  .or(sellerDocumentsFormZodSchema);

/**
 * The full assembled draft, keyed by step - each key is only actually
 * present once that step has been saved (see `RedisCacheSeller.getDraftSeller`),
 * so callers should treat this as `Partial<...>`.
 */
export const sellerDraftDetailsZodSchema = object({
  businessDetails: sellerBusinessDetailsZodSchema,
  bankDetails: sellerBankDetailsZodSchema,
  address: sellerAddressZodSchema,
  documents: sellerDocumentsFormZodSchema,
});

/* -------------------------------------------------------------------------- */
/*                      ADMIN - CREATE SELLER (FULL PAYLOAD)                  */
/* -------------------------------------------------------------------------- */

export const createSellerZodSchema = object({
  userId: string('User id is required')
    .trim()
    .nonempty('User id is required')
    .regex(REGEX.MONGODB_ID, 'Invalid user id'),
  businessDetails: sellerBusinessDetailsZodSchema.omit({ step: true }),
  bankDetails: sellerBankDetailsZodSchema.omit({ step: true }),
  address: sellerAddressZodSchema.omit({ step: true }),
  documents: sellerDocumentsFormZodSchema.omit({ step: true }),
});
