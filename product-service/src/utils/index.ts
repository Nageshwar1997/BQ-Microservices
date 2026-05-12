import { Types } from 'mongoose';
import type { TId } from '../types';

export const toObjectId = (id: string): TId => new Types.ObjectId(id);
