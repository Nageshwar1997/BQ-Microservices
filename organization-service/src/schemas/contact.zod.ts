import { CONTACT_QUERY_STATUS, CONTACT_QUERY_TYPES, REGEX } from '@beautinique/backend-constants';
import {
  emailValidation,
  enum as enum_z,
  object,
  phoneNumberValidation,
  string,
  type TInfer,
} from '@beautinique/backend-zod';

const nameValidation = string('Name is required')
  .trim()
  .nonempty('Name is required')
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be at most 100 characters long')
  .regex(REGEX.SINGLE_SPACE, "Name can't contain multiple spaces")
  .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'Name is invalid. e.g. John Doe');

const messageValidation = string('Message is required')
  .trim()
  .nonempty('Message is required')
  .min(10, 'Message must be at least 10 characters long')
  .max(2000, 'Message must be at most 2000 characters long');

const contactQueryIdValidation = string('Contact query id is required')
  .trim()
  .nonempty('Contact query id is required')
  .regex(REGEX.MONGODB_ID, 'Invalid contact query id');

export const createContactQueryZodSchema = object({
  name: nameValidation,
  email: emailValidation,
  phoneNumber: phoneNumberValidation,
  queryType: enum_z(CONTACT_QUERY_TYPES, 'Invalid query type'),
  message: messageValidation,
});

export type TCreateContactQueryZodSchema = TInfer<typeof createContactQueryZodSchema>;

export const updateContactQueryStatusZodSchema = object({
  status: enum_z(CONTACT_QUERY_STATUS, 'Invalid status'),
});

export type TUpdateContactQueryStatusZodSchema = TInfer<typeof updateContactQueryStatusZodSchema>;

export const contactIdParamsZodSchema = object({
  id: contactQueryIdValidation,
});

export type TContactIdParamsZodSchema = TInfer<typeof contactIdParamsZodSchema>;
