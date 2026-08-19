import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { checkEmptyRequest } from '@beautinique/backend-request';
import { tryCatchResponse } from '@beautinique/backend-response';
import {
  assignAdminTerritoryZodSchema,
  updateAdminStatusZodSchema,
  validateZod,
} from '@beautinique/backend-zod';
import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../../constants/index.js';
import {
  assignAdminTerritoryController,
  getStateAdminsController,
  getTerritoryMapController,
  updateAdminStatusController,
} from '../../../controllers/index.js';
import { authorize } from '../../../middlewares/index.js';

export const territoryRouter = Router();

const { assign, map, stateAdmins, status } = METHODS_AND_PATHS.admin.territory;

/* ================== TERRITORY CONFIG (MASTER only) ================== */

territoryRouter[assign.method](
  assign.path,
  authorize([USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ body: true, params: true }),
  validateZod({ body: assignAdminTerritoryZodSchema }),
  tryCatchResponse(assignAdminTerritoryController),
);

territoryRouter[map.method](
  map.path,
  authorize([USER_ROLE_MAP.MASTER]),
  tryCatchResponse(getTerritoryMapController),
);

/* ================== ADMIN STATUS (self or MASTER - see controller) ================== */

territoryRouter[status.method](
  status.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.SUPER_ADMIN, USER_ROLE_MAP.MASTER]),
  checkEmptyRequest({ body: true, params: true }),
  validateZod({ body: updateAdminStatusZodSchema }),
  tryCatchResponse(updateAdminStatusController),
);

/* ================== RESOLUTION LOOKUP (internal + admin UI) ================== */

territoryRouter[stateAdmins.method](
  stateAdmins.path,
  authorize([USER_ROLE_MAP.ADMIN, USER_ROLE_MAP.SUPER_ADMIN, USER_ROLE_MAP.MASTER]),
  tryCatchResponse(getStateAdminsController),
);
