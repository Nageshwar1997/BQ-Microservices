import { model } from 'mongoose';

import { adminTerritorySchema, contactQuerySchema, sellerSchema } from '../schemas/index.js';

export const ContactQuery = model('ContactQuery', contactQuerySchema);

export const Seller = model('Seller', sellerSchema);

export const AdminTerritory = model('AdminTerritory', adminTerritorySchema);
