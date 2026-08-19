import { Router } from 'express';

import { METHODS_AND_PATHS } from '../../constants/index.js';
import { territoryRouter } from './territory/index.js';

export const adminRouter = Router();

const { territory } = METHODS_AND_PATHS.admin;

adminRouter.use(territory.base, territoryRouter);
