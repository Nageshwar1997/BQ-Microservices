import { createError, ErrorBuilder } from '@beautinique/backend-classes';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer, { MulterError } from 'multer';

import type { IMulterValidation } from '../types/index.js';
import { getCustomError, getMulterDefaultError } from '../utils/index.js';

export const validateMulter = ({
  type,
  fieldName,
  maxCount,
  fieldsConfig,
  limits,
  format,
  size,
  isDev = false,
}: IMulterValidation) => {
  const storage = multer.memoryStorage();
  const upload = multer({ storage, limits });

  let uploadMiddleware: RequestHandler;

  // ===== Multer Setup =====
  switch (type) {
    case 'single':
      if (!fieldName) {
        throw new Error('Field name is required for single upload.');
      }

      uploadMiddleware = upload.single(fieldName);
      break;

    case 'array':
      if (!fieldName) {
        throw new Error('Field name is required for array upload.');
      }

      uploadMiddleware = upload.array(fieldName, maxCount);
      break;

    case 'fields':
      if (!fieldsConfig) {
        throw new Error('fieldsConfig is required.');
      }

      uploadMiddleware = upload.fields(fieldsConfig);
      break;

    case 'any':
      uploadMiddleware = upload.any();
      break;

    case 'none':
      uploadMiddleware = upload.none();
      break;

    default:
      throw new Error('Invalid upload type.');
  }

  const getFiles = (req: Request): Express.Multer.File[] => {
    switch (type) {
      case 'single':
        return req.file ? [req.file] : [];

      case 'array':
      case 'any':
        return (req.files ?? []) as Express.Multer.File[];

      case 'fields':
        return Object.values(req.files ?? {}).flat() as Express.Multer.File[];

      default:
        return [];
    }
  };

  // ===== Middleware =====
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (error) => {
      const errors = new ErrorBuilder();

      // ===== Multer Internal Errors =====
      errors.merge(getMulterDefaultError({ error, fieldName, maxCount, isDev }));

      // ===== Custom File Validation =====
      if (type !== 'none') {
        errors.merge(getCustomError({ files: getFiles(req), format, size }));
      }

      if (errors.hasErrors()) {
        const message =
          error instanceof Error || error instanceof MulterError
            ? error.message
            : 'File upload validation failed.';

        next(createError({ message, payload: errors }));
        return;
      }

      next();
    });
  };
};
