// These aren't in `@beautinique/backend-zod` yet - this repo can't bump that
// shared package on its own (see SELLER_FEATURE_PLAN.md), so the seller
// onboarding wizard's schemas live here for now, following the same
// `xZodSchema` naming convention used everywhere else.

import { REGEX } from '@beautinique/backend-constants';
import {
  object,
  sellerAddressZodSchema,
  sellerBankDetailsZodSchema,
  sellerBusinessDetailsZodSchema,
  sellerDocumentsZodSchema,
  string,
} from '@beautinique/backend-zod';

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
  documents: sellerDocumentsZodSchema.omit({ step: true }),
});
