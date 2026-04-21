import { Router } from 'express';
import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { imageRouter } from './image';
import { videoRouter } from './video';

export const router = Router();

const { image, video } = GATEWAY_METHODS_AND_PATHS;

router.use(image.base, imageRouter);
router.use(video.base, videoRouter);
