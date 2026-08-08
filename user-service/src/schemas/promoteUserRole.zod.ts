// Not in `@beautinique/backend-zod` - this is a single internal endpoint
// (organization-service's `createSeller` flow only, see
// organization-service/SELLER_FEATURE_PLAN.md), not worth a shared-package
// bump for. Follows the same `xZodSchema` naming convention used everywhere
// else.

import { literal, object, string } from '@beautinique/backend-zod';
import { REGEX } from '@beautinique/shared-constants';

export const promoteUserRoleParamsZodSchema = object({
  userId: string('User id is required')
    .trim()
    .nonempty('User id is required')
    .regex(REGEX.MONGODB_ID, 'Invalid user id'),
});

// Locked to `SELLER` for now - generalize only if another promotion path
// actually needs it.
export const promoteUserRoleBodyZodSchema = object({
  role: literal('SELLER', 'Only promotion to SELLER is supported'),
});
