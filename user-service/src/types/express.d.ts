import 'express-serve-static-core';

import type { IMinimalUser } from './index.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: null | IMinimalUser;
  }
}
