// These aren't in `@beautinique/backend-zod` yet - this repo can't bump that
// shared package on its own (see SELLER_FEATURE_PLAN.md), so the seller
// onboarding wizard's schemas live here for now, following the same
// `xZodSchema` naming convention used everywhere else.

import { REGEX, SELLER_APPROVAL_STATUS_MAP } from '@beautinique/backend-constants';
import { discriminatedUnion, literal, object, string } from '@beautinique/backend-zod';

/* -------------------------------------------------------------------------- */
/*                 ADMIN - REVIEW A PENDING SELLER APPLICATION                */
/* -------------------------------------------------------------------------- */

export const sellerIdParamsZodSchema = object({
  sellerId: string('Seller id is required')
    .trim()
    .nonempty('Seller id is required')
    .regex(REGEX.MONGODB_ID, 'Invalid seller id'),
});

export const updateSellerApprovalStatusZodSchema = discriminatedUnion('approvalStatus', [
  object({
    approvalStatus: literal(SELLER_APPROVAL_STATUS_MAP.APPROVED),
  }),
  object({
    approvalStatus: literal(SELLER_APPROVAL_STATUS_MAP.REJECTED),
    rejectReason: string('Reject reason is required').trim().nonempty('Reject reason is required'),
  }),
]);
