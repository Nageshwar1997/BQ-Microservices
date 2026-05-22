import { model } from 'mongoose';
import { sellerSchema, userSchema, wishlistSchema } from '../schemas';

export const User = model('User', userSchema);

export const Seller = model('Seller', sellerSchema);

export const Wishlist = model('Wishlist', wishlistSchema);
