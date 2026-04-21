import { type UploadApiErrorResponse, type UploadApiResponse } from 'cloudinary';
import { generateFolderName } from '..';
import { FILE_MIME, type TCloudinaryOption } from '@beautinique/be-constants';
import { MIME_TO_FORMAT } from '@/constants';
import { AppError } from '@beautinique/be-classes';
import { getCloudinaryInstance } from '@/configs';

export const uploadImageToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
  accountKey: TCloudinaryOption = 'image',
): Promise<UploadApiResponse> => {
  const cloudinary = getCloudinaryInstance(accountKey);
  const allowed_formats = FILE_MIME.IMAGE.map((mime) => MIME_TO_FORMAT.IMAGE[mime]);

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: generateFolderName(folder),
        resource_type: 'image',
        allowed_formats,
        use_filename: true,
        unique_filename: true,
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(
            new AppError({
              message: error?.message || 'Failed to upload image',
              statusCode: 500,
              code: 'INTERNAL_ERROR',
            }),
          );
        }

        const optimizedUrl = cloudinary.url(result.public_id, {
          quality: 'auto',
          fetch_format: 'auto',
        });

        resolve({ ...result, secure_url: optimizedUrl });
      },
    );

    // End the stream with buffer
    stream.end(file.buffer);
  });
};
