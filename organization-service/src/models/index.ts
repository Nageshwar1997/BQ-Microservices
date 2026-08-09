import { model } from 'mongoose';

import { contactQuerySchema, sellerSchema } from '../schemas/index.js';

export const ContactQuery = model('ContactQuery', contactQuerySchema);

export const Seller = model('Seller', sellerSchema);
