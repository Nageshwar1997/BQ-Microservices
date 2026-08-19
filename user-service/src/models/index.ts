import { model } from 'mongoose';

import { adminSchema, sellerSchema, userSchema, wishlistSchema } from '../schemas/index.js';

export const User = model('User', userSchema);

export const Seller = model('Seller', sellerSchema);

export const Wishlist = model('Wishlist', wishlistSchema);

export const Admin = model('Admin', adminSchema);
