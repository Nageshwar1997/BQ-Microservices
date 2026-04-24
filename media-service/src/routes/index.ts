import { Router } from 'express';
import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import { imageRouter } from './image';
import { videoRouter } from './video';
import { mediaRouter } from './media';

export const router = Router();

const { image, video,media } = GATEWAY_METHODS_AND_PATHS;

router.use(image.base, imageRouter);
router.use(video.base, videoRouter);
router.use(media.base, mediaRouter);
