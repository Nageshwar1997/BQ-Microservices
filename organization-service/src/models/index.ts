import { model } from 'mongoose';

import { contactQuerySchema } from '../schemas/index.js';

export const ContactQuery = model('ContactQuery', contactQuerySchema);
