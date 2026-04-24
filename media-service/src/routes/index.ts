import { Router } from 'express';
import { GATEWAY_METHODS_AND_PATHS } from '@/constants';
import {
  MulterMiddleware,
  RequestMiddleware,
  ResponseMiddleware,
} from '@beautinique/be-middlewares';
import {
  createUnusedMultipleMediaController,
  createUnusedSingleMediaController,
  getNonDeletedMultipleMediaController,
  getNonDeletedSingleMediaController,
  markAsDeletedMultipleMediaController,
  markAsDeletedSingleMediaController,
  markAsUsedMultipleMediaController,
  markAsUsedSingleMediaController,
  multipleMediaRemoveController,
  multipleMediaUploadController,
  singleMediaRemoveController,
  singleMediaUploadController,
} from '@/controllers';
import { envs } from '@/envs';

export const router = Router();

const {
  cloudinary_remove,
  cloudinary_upload,
  get_non_deleted,
  mark_as_deleted,
  mark_as_unused,
  mark_as_used,
} = GATEWAY_METHODS_AND_PATHS;

// Cloudinary routes

// Remove
router[cloudinary_remove.single.method](
  `${cloudinary_remove.base}${cloudinary_remove.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(singleMediaRemoveController),
);
router[cloudinary_remove.multiple.method](
  `${cloudinary_remove.base}${cloudinary_remove.multiple.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(multipleMediaRemoveController),
);

// Upload
router[cloudinary_upload.single.method](
  `${cloudinary_upload.base}${cloudinary_upload.single.path}`,
  MulterMiddleware.validate({ type: 'single', fieldName: 'file', isDev: envs.is_dev }),
  RequestMiddleware.emptyRequest({ body: true, file: true }),
  ResponseMiddleware.tryCatch(singleMediaUploadController),
);
router[cloudinary_upload.multiple.method](
  `${cloudinary_upload.base}${cloudinary_upload.multiple.path}`,
  MulterMiddleware.validate({ type: 'array', fieldName: 'files', isDev: envs.is_dev }),
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(multipleMediaUploadController),
);

// Database routes

// Mark as Deleted
router[mark_as_deleted.single.method](
  `${mark_as_deleted.base}${mark_as_deleted.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsDeletedSingleMediaController),
);
router[mark_as_deleted.multiple.method](
  `${mark_as_deleted.base}${mark_as_deleted.multiple.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsDeletedMultipleMediaController),
);

// Mark as Unused
router[mark_as_unused.single.method](
  `${mark_as_unused.base}${mark_as_unused.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(createUnusedSingleMediaController),
);
router[mark_as_unused.multiple.method](
  `${mark_as_unused.base}${mark_as_unused.multiple.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(createUnusedMultipleMediaController),
);

// Mark as Used
router[mark_as_used.single.method](
  `${mark_as_used.base}${mark_as_used.single.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsUsedSingleMediaController),
);
router[mark_as_unused.multiple.method](
  `${mark_as_unused.base}${mark_as_unused.multiple.path}`,
  RequestMiddleware.emptyRequest({ body: true }),
  ResponseMiddleware.tryCatch(markAsUsedMultipleMediaController),
);

// Get Non Deleted Data Routes
router[get_non_deleted.single.method](
  `${get_non_deleted.base}${get_non_deleted.single.path}`,
  RequestMiddleware.emptyRequest({ query: true }),
  ResponseMiddleware.tryCatch(getNonDeletedSingleMediaController),
);
router[get_non_deleted.multiple.method](
  `${get_non_deleted.base}${get_non_deleted.multiple.path}`,
  RequestMiddleware.emptyRequest({ query: true }),
  ResponseMiddleware.tryCatch(getNonDeletedMultipleMediaController),
);
