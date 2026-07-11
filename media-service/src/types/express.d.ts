import 'express-serve-static-core';

import type { TUserRole } from '@beautinique/shared-types';

// `Response.success` itself is declared by `@beautinique/backend-response`
// (object-argument signature: `res.success?.({ statusCode, message, data })`)
// - it must not be redeclared here with an incompatible positional signature.
declare module 'express-serve-static-core' {
  interface Request {
    user?: { _id: string; role: TUserRole } | null;
  }
}
