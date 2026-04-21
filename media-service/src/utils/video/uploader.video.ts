import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { generateFolderName, generatePublicId } from '..';
import { FILE_MIME, type TCloudinaryOption } from '@beautinique/be-constants';
import { MIME_TO_FORMAT } from '@/constants';
import { AppError } from '@beautinique/be-classes';
import { getCloudinaryInstance } from '@/configs';
import type { IPublicIdOptions } from '@/types';

export const uploadVideoToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
  accountKey: TCloudinaryOption = 'video',
  entity: IPublicIdOptions['entity'],
): Promise<UploadApiResponse> => {
  const cloudinary = getCloudinaryInstance(accountKey);

  const allowed_formats = FILE_MIME.VIDEO.map((mime) => MIME_TO_FORMAT.VIDEO[mime]);

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: generateFolderName(folder),
        public_id: generatePublicId({ entity, accountKey }),
        resource_type: 'video',
        allowed_formats,
        chunk_size: 6_000_000,
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(
            new AppError({
              message: error?.message || 'Failed to upload video',
              statusCode: 500,
              code: 'INTERNAL_ERROR',
            }),
          );
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });
};
