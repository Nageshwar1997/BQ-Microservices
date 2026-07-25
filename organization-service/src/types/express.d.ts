import 'express-serve-static-core';

import type { TMinimalUser } from './index.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: null | TMinimalUser;
  }
}
