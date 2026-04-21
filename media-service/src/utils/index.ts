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

export const toObjectId = (id: string): TId => new Types.ObjectId(id);

export const generateFolderName = (folder?: string) => {
  const sanitize = (str: string) => str.replace(/[&|/\\#?%]/g, '_');

  const subfolder = sanitize((folder || 'common_folder').split(' ').join('_'));

  return `${envs.cloudinary.main_folder}/${subfolder}`;
};

export const generatePublicId = ({ entityKey, accountKey }: IPublicIdOptions): string => {
  const { getDate, getFullYear, getMonth } = new Date();

  const year = getFullYear();
  const month = String(getMonth() + 1).padStart(2, '0');
  const day = String(getDate()).padStart(2, '0');

  const uuid = randomUUID();

  return `${accountKey}/${entityKey}/${year}/${month}/${day}/${uuid}`;
};

export const checkCloudinaryStatus = async (accountKey: TCloudinaryOption) => {
  try {
    const cloudinary = getCloudinaryInstance(accountKey);

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

const uploadToCloudinary = async ({
  accountKey,
  entityKey,
  file,
  folder,
  resourceType,
}: ICloudinaryUploader): Promise<UploadApiResponse> => {
  const cloudinary = getCloudinaryInstance(accountKey);

  const baseMemes =
    resourceType === 'image' ? FILE_MIME.IMAGE : resourceType === 'video' ? FILE_MIME.VIDEO : [];

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
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: generateFolderName(folder),
        public_id: generatePublicId({ entityKey, accountKey }),
        resource_type: resourceType,
        allowed_formats,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new AppError({
              message: error?.message || `Failed to upload ${resourceType} to cloudinary`,
              statusCode: 400,
              code: 'UPLOAD_ERROR',
            }),
          );
        }

        resolve(result);
      },
    );

    // End the stream with buffer
    stream.end(file.buffer);
  });
};

const deleteFromCloudinary = async (data: ICloudinaryRemover): Promise<UploadApiResponse> => {
  const { publicId, accountKey } = data;
  const cloudinary = getCloudinaryInstance(accountKey);

  return new Promise<UploadApiResponse>((resolve, reject) => {
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

export const singleImageUploader = async (data: ICloudinarySingleUploader) => {
  try {
    const { message, status } = await checkCloudinaryStatus(data.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

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

export const multiImageUploader = async (data: ICloudinaryMultiUploader) => {
  const uploadedPublicIds: string[] = [];

  const { files, ...rest } = data;
  try {
    const { message, status } = await checkCloudinaryStatus(rest.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    const uploadPromises = files.map(async (file) => {
      const res = await uploadToCloudinary({ ...rest, file, resourceType: 'image' });

      uploadedPublicIds.push(res.public_id);
      return res;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    // 🔥 Rollback (If anyone is failed)

    const deleteResults = await Promise.allSettled(
      uploadedPublicIds.map((id) => deleteFromCloudinary(id, data.accountKey)),
    );

    // 🔥 Keep failed id only from rollback
    const failedIds = deleteResults
      .map((res, index) => (res.status === 'rejected' ? uploadedPublicIds[index] : null))
      .filter(Boolean);

    // 👉 Add Job for failed ids only
    if (failedIds.length > 0) {
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

export const singleVideoUploader = async (data: ICloudinarySingleUploader) => {
  try {
    const { message, status } = await checkCloudinaryStatus(data.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

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

export const multiVideoUploader = async (data: ICloudinaryMultiUploader) => {
  const uploadedPublicIds: string[] = [];

  const { files, ...rest } = data;
  try {
    const { message, status } = await checkCloudinaryStatus(rest.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    const uploadPromises = files.map(async (file) => {
      const res = await uploadToCloudinary({ ...rest, file, resourceType: 'video' });

      uploadedPublicIds.push(res.public_id);
      return res;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    // 🔥 Rollback (If anyone is failed)

    const deleteResults = await Promise.allSettled(
      uploadedPublicIds.map((id) => deleteFromCloudinary(id, data.accountKey)),
    );

    // 🔥 Keep failed id only from rollback
    const failedIds = deleteResults
      .map((res, index) => (res.status === 'rejected' ? uploadedPublicIds[index] : null))
      .filter(Boolean);

    // 👉 Add Job for failed ids only
    if (failedIds.length > 0) {
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
      message: error instanceof Error ? error.message : 'Unexpected error during videos upload',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

export const singleImageRemover = async (data: TCloudinarySingleRemover) => {
  try {
    const { message, status } = await checkCloudinaryStatus(data.accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    const result = await deleteFromCloudinary(data);
    return result;
  } catch (error) {
    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during remove',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};

export const multiImageRemover = async ({ accountKey, publicIds }: ICloudinaryMultiRemover) => {
  try {
    const { message, status } = await checkCloudinaryStatus(accountKey);

    if (status !== 'ok') {
      throw new AppError({ message, statusCode: 500, code: 'INTERNAL_ERROR' });
    }

    const removePromises = publicIds.map((publicId) =>
      deleteFromCloudinary({ publicId, accountKey }),
    );

    const removeResults = await Promise.allSettled(removePromises);
  } catch (error) {
    throw new AppError({
      message: error instanceof Error ? error.message : 'Unexpected error during remove',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  }
};
