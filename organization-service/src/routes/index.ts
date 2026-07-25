import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import { teamRouter } from './team/index.js';

export const router = Router();

const { team } = METHODS_AND_PATHS;

router.use(team.base, teamRouter);
