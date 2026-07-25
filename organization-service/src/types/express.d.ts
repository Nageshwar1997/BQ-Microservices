import 'express-serve-static-core';

import type { IUser } from './index.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
  }
}
