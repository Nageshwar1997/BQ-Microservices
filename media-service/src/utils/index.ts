import { bullQueue } from '@/classes';
import { getCloudinaryInstance, logger } from '@/configs';
import { MIME_TO_FORMAT } from '@/constants';
import { envs } from '@/envs';
import type {
  ICloudinaryMultiRemover,
  ICloudinaryMultiUploader,
  ICloudinarySingleRemover,
  ICloudinarySingleUploader,
  IPublicIdOptions,
  TCloudinaryMediaRemover,
  TCloudinaryMediaUploader,
  TId,
  TResourceType,
} from '@/types';
import { AppError } from '@beautinique/be-classes';
import { FILE_MIME, type TCloudinaryOption } from '@beautinique/be-constants';
import type { DeleteApiResponse, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';

const DEFAULT_FOLDER_NAME = 'common_folder';
const FOLDER_SANITIZE_REGEX = /[&|/\\#?%]/g;
const MAX_REMOVE_RETRIES = 5;

/* ========== OBJECT ID CONVERTER FUNCTION ========== */
export const toObjectId = (id: string): TId => new Types.ObjectId(id);

/* ========== FOLDER NAME GENERATOR FUNCTION ========== */
export const generateFolderName = (folder?: string) => {
  // 🧹 Converts unsafe folder characters into safe underscores
  const sanitize = (str: string) => str.replace(FOLDER_SANITIZE_REGEX, '_');

  // 📁 Builds a clean subfolder name with a default fallback
  const subfolder = sanitize((folder || DEFAULT_FOLDER_NAME).trim().replace(/\s+/g, '_'));

  // 🏷️ Returns the final path with the main Cloudinary folder
  return `${envs.cloudinary.main_folder}/${subfolder}`;
};

/* ========== PUBLIC ID GENERATOR FUNCTION ========== */
export const generatePublicId = ({ entityKey, accountKey }: IPublicIdOptions): string => {
  // 📅 Gets current date parts to build a structured public id
  const { getDate, getFullYear, getMonth } = new Date();

  const year = getFullYear();
  const month = String(getMonth() + 1).padStart(2, '0');
  const day = String(getDate()).padStart(2, '0');

  // 🆔 Generates a unique uuid for every upload
  const uuid = randomUUID();

  // 🧱 Creates the final public id using account, entity, date, and uuid
  return `${accountKey}/${entityKey}/${year}/${month}/${day}/${uuid}`;
};

/* ========== CLOUDINARY STATUS CHECKER FUNCTION ========== */
const checkCloudinaryStatus = async (accountKey: TCloudinaryOption) => {
  try {
    // 🔌 Loads the Cloudinary instance for the requested account
    const cloudinary = getCloudinaryInstance(accountKey);

    // 🩺 Verifies the Cloudinary connection using ping
    const res = await cloudinary.api.ping();
    logger.info(`Cloudinary ${accountKey} Connected ✅`, res);
  } catch (err) {
    logger.error(`Cloudinary ${accountKey} Connection Error ❌`, err);
    throw new AppError({
      message: (err as Error).message || `Cloudinary ${accountKey} Connection Error ❌`,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

/* ========== FAILED ID EXTRACTOR FUNCTION ========== */
const getFailedIds = (results: PromiseSettledResult<unknown>[], ids: string[]) => {
  // 🚨 Collects only the ids whose operation failed
  return results.reduce<string[]>((acc, result, index) => {
    if (result.status === 'rejected') {
      acc.push(ids[index]);
    }

    return acc;
  }, []);
};

/* ========== ALLOWED FORMAT RESOLVER FUNCTION ========== */
const getAllowedFormats = (resourceType: TResourceType) => {
  // 🎞️ Chooses the mime collection based on the requested resource type
  const baseMimes =
    resourceType === 'image' ? FILE_MIME.IMAGE : resourceType === 'video' ? FILE_MIME.VIDEO : [];

  // 🧾 Maps mime types into Cloudinary-supported formats
  const allowedFormats = baseMimes
    .map((mime) => MIME_TO_FORMAT[resourceType][mime])
    .filter((format): format is string => Boolean(format));

  if (!allowedFormats.length) {
    throw new AppError({
      message: `Unsupported mime: ${baseMimes.join(', ')}`,
      statusCode: 400,
      code: 'UPLOAD_ERROR',
    });
  }

  return allowedFormats;
};

/* ========== FAILED REMOVAL QUEUE FUNCTION ========== */
const queueFailedRemovals = async ({
  accountKey,
  failedIds,
  retryCount,
}: {
  accountKey: TCloudinaryOption;
  failedIds: string[];
  retryCount?: number;
}) => {
  // 🔁 Skips queue work when there is nothing left to retry
  if (failedIds.length === 0) {
    return;
  }

  const data =
    retryCount === undefined
      ? { publicIds: failedIds, accountKey }
      : { publicIds: failedIds, accountKey, retryCount };

  // 🧵 Pushes failed cleanup ids into the queue for background retry
  await bullQueue.addJob({
    queueName: 'media-queue',
    jobName: 'multi-cloudinary-media-remove',
    data,
  });
};

/* ========== SINGLE MEDIA CLOUDINARY REMOVER FUNCTION ========== */
const singleMediaRemover = ({ publicId, accountKey }: ICloudinarySingleRemover) => {
  // ☁️ Loads the Cloudinary instance for the remove action
  const cloudinary = getCloudinaryInstance(accountKey);

  return new Promise<DeleteApiResponse>((resolve, reject) => {
    // 🗑️ Deletes the given public id from Cloudinary storage
    cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
      if (error) {
        logger.error('Failed to remove image from Cloudinary', error);
        return reject(
          new AppError({
            message: error.message || 'Failed to remove image from Cloudinary',
            statusCode: 400,
            code: 'INTERNAL_ERROR',
          }),
        );
      }

      logger.info('Image removed from Cloudinary', result);

      // ✅ Resolves the delete response after successful removal
      resolve(result);
    });
  });
};

/* ========== MULTIPLE MEDIA CLOUDINARY REMOVER FUNCTION ========== */
const multipleMediaRemover = async ({
  accountKey,
  publicIds,
  retryCount = 0, // 🔥 !Important: Don't Remove it
}: ICloudinaryMultiRemover) => {
  // 🗑️ Builds remove promises for every public id in the batch
  const removeResults = await Promise.allSettled(
    publicIds.map((publicId) => singleMediaRemover({ publicId, accountKey })),
  );

  // 🚨 Collects only the ids that failed during removal
  const failedIds = getFailedIds(removeResults, publicIds);

  // 🔁 Queues failed deletes again while retry limit is not reached
  if (failedIds.length > 0 && retryCount < MAX_REMOVE_RETRIES) {
    await queueFailedRemovals({ accountKey, failedIds, retryCount: retryCount + 1 });
  }

  // 🚫 Logs the final failed ids when max retries are exhausted
  if (failedIds.length > 0 && retryCount >= MAX_REMOVE_RETRIES) {
    logger.error('Max retries reached for IDs:', failedIds);
  }

  // 📦 Returns a summary of the batch remove operation
  return {
    success: failedIds.length === 0,
    partialFailure: failedIds.length > 0,
    failedIds,
    retryCount,
  };
};

/* ========== MEDIA REMOVER ENTRY FUNCTION ========== */
export const mediaRemover = async (data: TCloudinaryMediaRemover) => {
  const { accountKey, publicId, publicIds, retryCount } = data;

  const error = new AppError({
    message: 'Invalid payload: provide publicId or publicIds',
    statusCode: 400,
    code: 'VALIDATION_ERROR',
  });

  // 🚫 Rejects invalid payloads where no removable id is provided
  if (!publicId && !publicIds?.length) throw error;

  // 🩺 Validates the Cloudinary connection before any remove action
  await checkCloudinaryStatus(accountKey);

  if (publicId) {
    // 🎯 Routes single media delete requests to the common remover
    return singleMediaRemover(data);
  }

  if (publicIds) {
    // 📚 Routes multi media delete requests to the batch remover
    return multipleMediaRemover({ accountKey, publicIds, retryCount });
  }

  throw error;
};

/* ========== SINGLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
const singleMediaUploader = ({
  accountKey,
  entityKey,
  file,
  folder,
  resourceType,
  allowed_formats,
}: ICloudinarySingleUploader) => {
  // ☁️ Selects the target Cloudinary account for upload
  const cloudinary = getCloudinaryInstance(accountKey);

  return new Promise<UploadApiResponse>((resolve, reject) => {
    // 🚀 Starts the stream-based upload
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: generateFolderName(folder),
        public_id: generatePublicId({ entityKey, accountKey }),
        resource_type: resourceType,
        allowed_formats,
      },
      (error, result) => {
        // ❌ Rejects with a standardized app error if upload fails
        if (error || !result) {
          return reject(
            new AppError({
              message: error?.message || `Failed to upload ${resourceType}`,
              statusCode: 400,
              code: 'UPLOAD_ERROR',
            }),
          );
        }

        // ✅ Resolves the successful Cloudinary response
        resolve(result);
      },
    );

    // 📦 Pushes the incoming file buffer into the stream
    stream.end(file.buffer);
  });
};

/* ========== MULTIPLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
const multipleMediaUploader = async (data: ICloudinaryMultiUploader) => {
  // 🧾 Tracks successful upload public ids for rollback
  const uploadedPublicIds: string[] = [];
  const { files, ...rest } = data;

  try {
    // 📤 Uploads all selected files in parallel
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const res = await singleMediaUploader({ ...rest, file });

        // ✅ Stores successful ids to support rollback
        uploadedPublicIds.push(res.public_id);
        return res;
      }),
    );

    return uploadResults;
  } catch (error) {
    // ♻️ Starts rollback when any upload in the batch fails

    // 🧹 Tries to remove media files that were already uploaded
    const deleteResults = await Promise.allSettled(
      uploadedPublicIds.map((publicId) =>
        singleMediaRemover({ publicId, accountKey: rest.accountKey }),
      ),
    );

    // 🚨 Keeps only the ids that also failed during rollback
    const failedIds = getFailedIds(deleteResults, uploadedPublicIds);

    // 🔁 Queues failed cleanup ids for retry processing
    await queueFailedRemovals({ accountKey: rest.accountKey, failedIds });

    throw error;
  }
};

/* ========== MEDIA UPLOADER ENTRY FUNCTION ========== */
export const mediaUploader = async (data: TCloudinaryMediaUploader) => {
  const { file, files, ...rest } = data;
  const { accountKey, resourceType } = rest;

  const error = new AppError({
    message: 'Invalid payload: provide file or files',
    statusCode: 400,
    code: 'VALIDATION_ERROR',
  });

  // 🚫 Rejects invalid payloads where no uploadable file is provided
  if (!file && !files?.length) {
    throw error;
  }

  // 🩺 Validates the Cloudinary connection before any upload action
  await checkCloudinaryStatus(accountKey);

  // 🧾 Resolves the allowed upload formats once for this request
  const allowed_formats = getAllowedFormats(resourceType);
  const uploadPayload = { ...rest, allowed_formats };

  if (files && files?.length) {
    // 📚 Routes multi file upload requests to the batch uploader
    return multipleMediaUploader({ ...uploadPayload, files });
  }
  if (file) {
    // 🎯 Routes single file upload requests to the common uploader
    return singleMediaUploader({ ...uploadPayload, file });
  }

  throw error;
};
