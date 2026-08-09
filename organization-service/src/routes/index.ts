import { Router } from 'express';

import { METHODS_AND_PATHS } from '../constants/index.js';
import { contactRouter } from './contact/index.js';
import { sellerRouter } from './seller/index.js';
import { teamRouter } from './team/index.js';

export const router = Router();

const { contact, seller, team } = METHODS_AND_PATHS;

router.use(contact.base, contactRouter);
router.use(seller.base, sellerRouter);
router.use(team.base, teamRouter);
