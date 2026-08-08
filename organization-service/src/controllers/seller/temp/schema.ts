// TODO: migrate these to @beautinique/frontend-zod (with matching inferred types moved to
// @beautinique/frontend-types) once the seller-review endpoints ship server-side — this repo can't
// bump those shared packages on its own, so the seller onboarding wizard's schemas live here for
// now, following the same `xZodSchema`/`TXZodSchema` naming convention used everywhere else.

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

import { BANK_ACCOUNT_NUMBER_REGEX, IFSC_REGEX, SELLER_FORM_ID_MAP } from './constants.js';

/* -------------------------------------------------------------------------- */
/*                          STEP 1 — BUSINESS DETAILS                         */
/* -------------------------------------------------------------------------- */

export const sellerBusinessDetailsZodSchema = object({
  step: literal(SELLER_FORM_ID_MAP[0]),
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

/* -------------------------------------------------------------------------- */
/*                         STEP 2 — BANK & TAX DETAILS                        */
/* -------------------------------------------------------------------------- */
// SELLER_STEPPER_STEP_COUNT_MAP;
export const sellerBankDetailsZodSchema = object({
  step: literal(SELLER_FORM_ID_MAP[1]),
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

/* -------------------------------------------------------------------------- */
/*                             STEP 3 — ADDRESS                               */
/* -------------------------------------------------------------------------- */

export const sellerAddressZodSchema = object({
  step: literal(SELLER_FORM_ID_MAP[2]),
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

/* -------------------------------------------------------------------------- */
/*                            STEP 4 — DOCUMENTS                              */
/* -------------------------------------------------------------------------- */

export const sellerDocumentsFormZodSchema = object({
  step: literal(SELLER_FORM_ID_MAP[3]),
  id: imageUrlValidation,
  address: imageUrlValidation,
  license: imageUrlValidation,
  pan: imageUrlValidation,
  gst: imageUrlValidation,
  bank: imageUrlValidation,
});
