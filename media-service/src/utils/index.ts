import type { TId } from '@/types';
import { Types } from 'mongoose';

export const toObjectId = (id: string): TId => new Types.ObjectId(id);
