import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import { contactRouter } from './contact/index.js';
import { teamRouter } from './team/index.js';

export const router = Router();

const { contact, team } = METHODS_AND_PATHS;

router.use(contact.base, contactRouter);
router.use(team.base, teamRouter);
