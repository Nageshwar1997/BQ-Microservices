import { bullQueue } from '@/classes';
import { getCloudinaryInstance, logger } from '@/configs';
import { MIME_TO_FORMAT } from '@/constants';
import { envs } from '@/envs';
import type {
  ICloudinaryMultiRemover,
  ICloudinaryMultiUploader,
  ICloudinaryRemover,
  ICloudinarySingleUploader,
  ICloudinaryUploader,
  IPublicIdOptions,
  TCloudinarySingleRemover,
  TId,
} from '@/types';
import { AppError } from '@beautinique/be-classes';
import { FILE_MIME, type TCloudinaryOption } from '@beautinique/be-constants';
import type { UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';

/* ========== OBJECT ID CONVERTER ========== */
export const toObjectId = (id: string): TId => new Types.ObjectId(id);

/* ========== FOLDER NAME GENERATOR ========== */
export const generateFolderName = (folder?: string) => {
  // 🧹 Converts unsafe folder characters into safe underscores
  const sanitize = (str: string) => str.replace(/[&|/\\#?%]/g, '_');

  // 📁 Builds a clean subfolder name with a default fallback
  const subfolder = sanitize((folder || 'common_folder').split(' ').join('_'));

  // 🏷️ Returns the final path with the main Cloudinary folder
  return `${envs.cloudinary.main_folder}/${subfolder}`;
};

/* ========== PUBLIC ID GENERATOR ========== */
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

/* ========== CLOUDINARY STATUS CHECKER ========== */
export const checkCloudinaryStatus = async (accountKey: TCloudinaryOption) => {
  try {
    // 🔌 Loads the Cloudinary instance for the requested account
    const cloudinary = getCloudinaryInstance(accountKey);

    // 🩺 Verifies the Cloudinary connection using ping
    const res = await cloudinary.api.ping();
    logger.info(`Cloudinary ${accountKey} Connected ✅`, res);
    return {
      status: 'ok',
      message: `Cloudinary ${accountKey} Connected ✅`,
    } as const;
  } catch (err) {
    logger.error(`Cloudinary ${accountKey} Connection Error ❌`, err);
    return {
      message: `Cloudinary ${accountKey} Connection Error ❌`,
    };
  }
};

/* ========== COMMON CLOUDINARY UPLOADER ========== */
const uploadToCloudinary = async ({
  accountKey,
  entityKey,
  file,
  folder,
  resourceType,
}: ICloudinaryUploader): Promise<UploadApiResponse> => {
  // ☁️ Selects the target Cloudinary account for upload
  const cloudinary = getCloudinaryInstance(accountKey);

  // 🎞️ Chooses the allowed mime group based on resource type
  const baseMemes =
    resourceType === 'image' ? FILE_MIME.IMAGE : resourceType === 'video' ? FILE_MIME.VIDEO : [];

  // 🧾 Maps mime types into Cloudinary-supported formats
  const allowed_formats = baseMemes?.map((mime) => {
    const format = MIME_TO_FORMAT[resourceType][mime];

    if (!format)
      throw new AppError({
        message: `Unsupported mime: ${mime}`,
        statusCode: 400,
        code: 'UPLOAD_ERROR',
      });
    return format;
  });

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
        // ❌ Throws a standardized app error if upload fails
        if (error || !result) {
          return reject(
            new AppError({
              message: error?.message || `Failed to upload ${resourceType} to cloudinary`,
              statusCode: 400,
              code: 'UPLOAD_ERROR',
            }),
          );
        }

        // ✅ Resolves the successful upload result
        resolve(result);
      },
    );

    // 📦 Pushes the incoming file buffer into the stream
    stream.end(file.buffer);
  });
};

/* ========== COMMON MEDIA REMOVER ========== */
const removeFromCloudinary = async (data: ICloudinaryRemover): Promise<UploadApiResponse> => {
  const { publicId, accountKey } = data;

  // ☁️ Loads the Cloudinary instance for the remove action
  const cloudinary = getCloudinaryInstance(accountKey);

  return new Promise<UploadApiResponse>((resolve, reject) => {
    // 🗑️ Deletes the given public id from Cloudinary
    cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
      if (error) {
        logger.error('Failed to remove image from Cloudinary', error);
        return reject(
          new AppError({
            message: error.message || 'Failed to remove image from Cloudinary',
            statusCode: 500,
            code: 'INTERNAL_ERROR',
          }),
        );
      }
      logger.info('Image removed from Cloudinary', result);
      resolve(result);
    });
  });
};

/* ========== SINGLE IMAGE UPLOADER ========== */
export const singleImageUploader = async (data: ICloudinarySingleUploader) => {
  try {
    // 🩺 Validates the Cloudinary connection before upload
    const { message, status } = await checkCloudinaryStatus(data.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    // 🖼️ Uploads a single image to Cloudinary
    const result = await uploadToCloudinary({ ...data, resourceType: 'image' });

    return result;
  } catch (error) {
    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during image upload',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

/* ========== MULTI IMAGE UPLOADER ========== */
export const multiImageUploader = async (data: ICloudinaryMultiUploader) => {
  // 🧾 Tracks successful upload public ids for rollback
  const uploadedPublicIds: string[] = [];

  const { files, ...rest } = data;
  try {
    // 🩺 Verifies the connection before batch upload
    const { message, status } = await checkCloudinaryStatus(rest.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    // 📤 Uploads all images in parallel
    const uploadPromises = files.map(async (file) => {
      const res = await uploadToCloudinary({ ...rest, file, resourceType: 'image' });

      // ✅ Stores successful ids to support rollback
      uploadedPublicIds.push(res.public_id);
      return res;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    // 🔥 Rollback (If anyone is failed)

    // ♻️ Tries to clean up files that were already uploaded
    const deleteResults = await Promise.allSettled(
      uploadedPublicIds.map((publicId) =>
        removeFromCloudinary({ publicId, accountKey: rest.accountKey }),
      ),
    );

    // 🔥 Keep failed id only from rollback
    const failedIds = deleteResults
      .map((res, index) => (res.status === 'rejected' ? uploadedPublicIds[index] : null))
      .filter(Boolean);

    // 👉 Add Job for failed ids only
    if (failedIds.length > 0) {
      // 🧵 Pushes failed rollback cases into the queue for retry
      if (failedIds.length === 1) {
        await bullQueue.addJob({
          queueName: 'media-queue',
          data: { publicId: failedIds[0], accountKey: rest.accountKey },
          jobName: 'single-cloudinary-media-remove',
        });
      } else {
        await bullQueue.addJob({
          queueName: 'media-queue',
          data: { publicIds: failedIds, accountKey: rest.accountKey },
          jobName: 'multi-cloudinary-media-remove',
        });
      }
    }

    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during images upload',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

/* ========== SINGLE VIDEO UPLOADER ========== */
export const singleVideoUploader = async (data: ICloudinarySingleUploader) => {
  try {
    // 🩺 Validates the Cloudinary connection before upload
    const { message, status } = await checkCloudinaryStatus(data.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    // 🎥 Uploads a single video to Cloudinary
    const result = await uploadToCloudinary({ ...data, resourceType: 'video' });

    return result;
  } catch (error) {
    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during video upload',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

/* ========== MULTI VIDEO UPLOADER ========== */
export const multiVideoUploader = async (data: ICloudinaryMultiUploader) => {
  // 🧾 Tracks successful upload public ids for rollback
  const uploadedPublicIds: string[] = [];

  const { files, ...rest } = data;
  try {
    // 🩺 Verifies the connection before batch upload
    const { message, status } = await checkCloudinaryStatus(rest.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    // 📤 Uploads all videos in parallel
    const uploadPromises = files.map(async (file) => {
      const res = await uploadToCloudinary({ ...rest, file, resourceType: 'video' });

      // ✅ Stores successful ids to support rollback
      uploadedPublicIds.push(res.public_id);
      return res;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    // 🔥 Rollback (If anyone is failed)

    // ♻️ Tries to clean up videos that were already uploaded
    const deleteResults = await Promise.allSettled(
      uploadedPublicIds.map((publicId) =>
        removeFromCloudinary({ publicId, accountKey: rest.accountKey }),
      ),
    );

    // 🔥 Keep failed id only from rollback
    const failedIds = deleteResults
      .map((res, index) => (res.status === 'rejected' ? uploadedPublicIds[index] : null))
      .filter(Boolean);

    // 👉 Add Job for failed ids only
    if (failedIds.length > 0) {
      // 🧵 Sends failed rollback ids to the queue for retry
      await bullQueue.addJob({
        queueName: 'media-queue',
        data: { publicIds: failedIds, accountKey: rest.accountKey },
        jobName: 'multi-cloudinary-media-remove',
      });
    }

    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during videos upload',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

/* ========== SINGLE PUBLIC ID REMOVER ========== */
export const singlePublicIdRemover = async (data: TCloudinarySingleRemover) => {
  try {
    // 🩺 Validates the Cloudinary connection before remove
    const { message, status } = await checkCloudinaryStatus(data.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    // 🗑️ Removes a single media from Cloudinary
    const result = await removeFromCloudinary(data);
    return result;
  } catch (error) {
    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during remove',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

/* ========== MULTI PUBLIC ID REMOVER ========== */
export const multiPublicIdsRemover = async ({
  accountKey,
  publicIds,
  retryCount = 0, // 🔥 !Important: Don't Remove it
}: ICloudinaryMultiRemover) => {
  try {
    // 🩺 Verifies the Cloudinary connection before batch remove
    const { message, status } = await checkCloudinaryStatus(accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    // 🗑️ Builds remove promises for all public ids
    const removePromises = publicIds.map((publicId) =>
      removeFromCloudinary({ publicId, accountKey }),
    );

    // ⏳ Waits for all remove operations to settle
    const removeResults = await Promise.allSettled(removePromises);

    // 🔥 Failed IDs
    const failedIds = removeResults.reduce<string[]>((acc, res, index) => {
      if (res.status === 'rejected') {
        acc.push(publicIds[index]);
      }
      return acc;
    }, []);

    const MAX_RETRIES = 5;

    // 🔁 Queues failed deletes with an incremented retry count
    if (failedIds.length > 0 && retryCount < MAX_RETRIES) {
      await bullQueue.addJob({
        queueName: 'media-queue',
        jobName: 'multi-cloudinary-media-remove',
        data: { publicIds: failedIds, accountKey, retryCount: retryCount + 1 },
      });
    }

    if (failedIds.length > 0 && retryCount >= MAX_RETRIES) {
      // 🚨 Logs a final error when the retry limit is reached
      logger.error('Max retries reached for IDs:', failedIds);
    }

    // 👉 !Important: Return response don't remove any key
    return {
      success: failedIds.length === 0,
      partialFailure: failedIds.length > 0,
      failedIds,
      retryCount,
    };
  } catch (error) {
    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during remove',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};
