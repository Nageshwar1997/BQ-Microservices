import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import { validateZod } from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import {
  createContactQueryController,
  getContactQueriesController,
  updateContactQueryStatusController,
} from '../../controllers/index.js';
import { authorize } from '../../middlewares/index.js';
import {
  contactIdParamsZodSchema,
  createContactQueryZodSchema,
  updateContactQueryStatusZodSchema,
} from '../../schemas/index.js';

export const contactRouter = Router();

const { create, list, updateStatus } = METHODS_AND_PATHS.contact;

contactRouter[create.method](
  create.path,
  checkEmptyRequest({ body: true }),
  validateZod({ body: createContactQueryZodSchema }),
  tryCatchResponse(createContactQueryController),
);

contactRouter[list.method](
  list.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER]),
  tryCatchResponse(getContactQueriesController),
);

contactRouter[updateStatus.method](
  updateStatus.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ body: true }),
  validateZod({ params: contactIdParamsZodSchema, body: updateContactQueryStatusZodSchema }),
  tryCatchResponse(updateContactQueryStatusController),
);
