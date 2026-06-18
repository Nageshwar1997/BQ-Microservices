import 'express-serve-static-core';
import type { IUser } from '.';

type TTask = () => Promise<void>;

declare module 'express-serve-static-core' {
  interface Locals {
    afterCommit?: TTask[];
    afterRollback?: TTask[];
    afterResponse?: TTask[];
    afterFinish?: TTask[];
  }

  interface Response {
    success: (statusCode: number, message: string, data?: object) => void;
  }

  interface Request {
    requestId?: string;
    user?: IUser;
  }
}
