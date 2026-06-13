import type { Request, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { getUser } from '../../utils';

export const createPendingProductController = async (
  req: Request,
  res: Response,
  session: ClientSession,
) => {
  const { _id: userId } = getUser(req);
};
