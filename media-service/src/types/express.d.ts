import 'express-serve-static-core';

import type { TUserRole } from '@beautinique/shared-types';

declare module 'express-serve-static-core' {
  interface Response {
    success: (statusCode: number, message: string, data?: object) => void;
  }
  interface Request {
    requestId?: string;
    user?: { _id: string; role: TUserRole } | null;
  }
}
