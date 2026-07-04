import { ConfigurationError, createError, ErrorBuilder } from '@beautinique/backend-classes';
import {
  IMAGE_MIMES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MB,
  VIDEO_MIMES,
} from '@beautinique/shared-constants';
import type { TImageMime, TVideoMime } from '@beautinique/shared-types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer, { memoryStorage, MulterError } from 'multer';

import type { IMulterCustomError, IMulterDefaultError, IMulterValidation } from '../types/index.js';

const createUploadMiddleware = ({
  type,
  fieldName,
  maxCount,
  fieldsConfig,
  limits,
}: Pick<
  IMulterValidation,
  'type' | 'fieldName' | 'maxCount' | 'fieldsConfig' | 'limits'
>): RequestHandler => {
  const upload = multer({ storage: memoryStorage(), limits });

  switch (type) {
    case 'single':
      if (!fieldName) {
        throw new ConfigurationError(
          "The 'fieldName' option is required when upload type is 'single'.",
        );
      }

      return upload.single(fieldName);

    case 'array':
      if (!fieldName) {
        throw new ConfigurationError(
          "The 'fieldName' option is required when upload type is 'array'.",
        );
      }

      return upload.array(fieldName, maxCount);

    case 'fields':
      if (!fieldsConfig) {
        throw new ConfigurationError(
          "The 'fieldsConfig' option is required when upload type is 'fields'.",
        );
      }

      return upload.fields(fieldsConfig);

    case 'any':
      return upload.any();

    case 'none':
      return upload.none();

    default:
      throw new ConfigurationError(`Unsupported upload type '${String(type)}'.`);
  }
};

const getUploadedFiles = (req: Request, type: IMulterValidation['type']): Express.Multer.File[] => {
  switch (type) {
    case 'single':
      return req.file ? [req.file] : [];

    case 'array':
    case 'any':
      return (req.files as Express.Multer.File[] | undefined) ?? [];

    case 'fields':
      return Object.values(
        (req.files as Record<string, Express.Multer.File[]> | undefined) ?? {},
      ).flat();

    case 'none':
      return [];

    default:
      return [];
  }
};

const collectCustomErrors = (
  errors: ErrorBuilder,
  { files, format, size }: IMulterCustomError,
): void => {
  // ===== Allowed Size Limits =====
  const imageSizeLimit = size?.IMAGE ?? MAX_IMAGE_SIZE;
  const videoSizeLimit = size?.VIDEO ?? MAX_VIDEO_SIZE;
  const otherSizeLimit = size?.OTHER ?? 2 * MB;

  // ===== Allowed MIME Types =====
  const allowedImageTypes = format?.IMAGE ?? IMAGE_MIMES;
  const allowedVideoTypes = format?.VIDEO ?? VIDEO_MIMES;
  const allowedOtherTypes = format?.OTHER ?? [];

  const allowedTypesSet = new Set([
    ...allowedImageTypes,
    ...allowedVideoTypes,
    ...allowedOtherTypes,
  ]);

  const allowedTypes = [...allowedTypesSet].map((type) => type.split('/')[1]).join(', ');

  for (const file of files) {
    const { originalname, fieldname, mimetype, size: fileSize } = file;

    const isImage = allowedImageTypes.includes(mimetype as TImageMime);

    const isVideo = allowedVideoTypes.includes(mimetype as TVideoMime);

    const isOther = allowedOtherTypes.includes(mimetype);

    // ===== Unsupported Media Type =====
    if (!isImage && !isVideo && !isOther) {
      errors.addField(
        fieldname,
        `File '${originalname}' has an unsupported media type '${mimetype}'. Allowed file types: ${allowedTypes}.`,
        'UNSUPPORTED_MEDIA_TYPE',
      );

      continue;
    }

    let maxAllowedSize = otherSizeLimit;
    let mediaType = 'File';

    if (isImage) {
      maxAllowedSize = imageSizeLimit;
      mediaType = 'Image';
    } else if (isVideo) {
      maxAllowedSize = videoSizeLimit;
      mediaType = 'Video';
    }

    // ===== File Size Validation =====
    if (fileSize > maxAllowedSize) {
      errors.addField(
        fieldname,
        `${mediaType} '${originalname}' exceeds the maximum allowed size (${(
          maxAllowedSize / MB
        ).toFixed(2)} MB). Received: ${(fileSize / MB).toFixed(2)} MB.`,
        'PAYLOAD_TOO_LARGE',
      );
    }
  }
};

const getCause = (cause: unknown, isDev = false) => {
  if (!cause || !isDev) {
    return '';
  }

  if (cause instanceof Error) {
    return ` (cause: ${cause.message})`;
  }

  try {
    return ` (cause: ${JSON.stringify(cause)})`;
  } catch {
    return ` (cause: UNABLE_TO_PARSE_CAUSE)`;
  }
};

const collectMulterErrors = (
  errors: ErrorBuilder,
  { error, fieldName = '', maxCount, isDev }: IMulterDefaultError,
): void => {
  if (!error) {
    return;
  }

  // ===== Non-Multer Errors =====
  if (!(error instanceof MulterError)) {
    if (error instanceof Error) {
      errors.addGlobal(
        `Upload failed: ${error.message}.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
    } else {
      errors.addGlobal('Upload failed.', 'BAD_REQUEST');
    }
    return;
  }

  const field = (error.field ?? fieldName) || 'field';

  switch (error.code) {
    case 'LIMIT_UNEXPECTED_FILE': {
      const expected =
        fieldName && maxCount
          ? ` Expected '${fieldName}' with a maximum of ${String(maxCount)} file${maxCount > 1 ? 's' : ''}.`
          : '';

      errors.addField(
        field,
        `${error.field ? `Unexpected file '${field}'.` : 'Unexpected file upload.'}${expected}${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );

      return;
    }

    case 'LIMIT_FILE_COUNT':
      errors.addField(
        field,
        `Too many files uploaded. Maximum allowed: ${String(maxCount ?? 'limited')}.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
      return;

    case 'LIMIT_FILE_SIZE':
      errors.addField(
        field,
        `File '${field}' exceeds the maximum allowed size.${getCause(error.cause, isDev)}`,
        'PAYLOAD_TOO_LARGE',
      );
      return;

    case 'LIMIT_FIELD_COUNT':
      errors.addField(
        field,
        `Too many form fields were submitted.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
      return;

    case 'LIMIT_FIELD_KEY':
      errors.addField(
        field,
        `Form field name exceeds the allowed length.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
      return;

    case 'LIMIT_FIELD_VALUE':
      errors.addField(
        field,
        `Form field value exceeds the allowed size.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
      return;

    case 'LIMIT_PART_COUNT':
      errors.addField(
        field,
        `Too many multipart form sections were submitted.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
      return;

    case 'MISSING_FIELD_NAME':
      errors.addField(
        field,
        `Multipart request contains a field without a name.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
      return;

    default:
      errors.addField(
        field,
        `Upload failed with Multer error '${String(error.code)}'.${getCause(error.cause, isDev)}`,
        'BAD_REQUEST',
      );
  }
};

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
  const uploadMiddleware = createUploadMiddleware({
    type,
    fieldName,
    maxCount,
    fieldsConfig,
    limits,
  });

  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (error) => {
      const errors = new ErrorBuilder();

      // ===== Multer Internal Validation =====
      collectMulterErrors(errors, { error, fieldName, maxCount, isDev });

      // If Multer itself failed, stop immediately.
      if (!errors.isEmpty()) {
        next(
          createError({
            message: error instanceof Error ? error.message : 'File upload failed.',
            payload: errors,
          }),
        );
        return;
      }

      // ===== Custom Validation =====
      collectCustomErrors(errors, { files: getUploadedFiles(req, type), format, size });

      if (!errors.isEmpty()) {
        next(createError({ message: 'File validation failed.', payload: errors }));
        return;
      }

      next();
    });
  };
};
