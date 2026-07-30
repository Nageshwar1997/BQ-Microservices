import { emailValidation, phoneNumberValidation } from '@beautinique/backend-zod';
import { REGEX } from '@beautinique/shared-constants';
import { z } from '@beautinique/shared-zod';

import { CONTACT_QUERY_STATUS, CONTACT_QUERY_TYPES } from '../constants/index.js';

const nameValidation = z
  .string('Name is required')
  .trim()
  .nonempty('Name is required')
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be at most 100 characters long')
  .regex(REGEX.SINGLE_SPACE, "Name can't contain multiple spaces")
  .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'Name is invalid. e.g. John Doe');

const messageValidation = z
  .string('Message is required')
  .trim()
  .nonempty('Message is required')
  .min(10, 'Message must be at least 10 characters long')
  .max(2000, 'Message must be at most 2000 characters long');

const contactQueryIdValidation = z
  .string('Contact query id is required')
  .trim()
  .nonempty('Contact query id is required')
  .regex(REGEX.MONGODB_ID, 'Invalid contact query id');

export const createContactQueryZodSchema = z.object({
  name: nameValidation,
  email: emailValidation,
  phoneNumber: phoneNumberValidation,
  queryType: z.enum(CONTACT_QUERY_TYPES, 'Invalid query type'),
  message: messageValidation,
});

export type TCreateContactQueryZodSchema = z.infer<typeof createContactQueryZodSchema>;

export const updateContactQueryStatusZodSchema = z.object({
  status: z.enum(CONTACT_QUERY_STATUS, 'Invalid status'),
});

export type TUpdateContactQueryStatusZodSchema = z.infer<typeof updateContactQueryStatusZodSchema>;

export const contactIdParamsZodSchema = z.object({
  id: contactQueryIdValidation,
});

export type TContactIdParamsZodSchema = z.infer<typeof contactIdParamsZodSchema>;
