import type { TInfer } from '@beautinique/backend-zod';

import type {
  sellerAddressZodSchema,
  sellerBankDetailsZodSchema,
  sellerBusinessDetailsZodSchema,
  sellerDocumentsFormZodSchema,
} from './schema.js';

export type TSellerBusinessDetailsZodSchema = TInfer<typeof sellerBusinessDetailsZodSchema>;

export type TSellerAddressZodSchema = TInfer<typeof sellerAddressZodSchema>;

export type TSellerBankDetailsZodSchema = TInfer<typeof sellerBankDetailsZodSchema>;

export type TSellerDocumentsFormZodSchema = TInfer<typeof sellerDocumentsFormZodSchema>;
