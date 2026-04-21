import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { generateFolderName } from '..';
import { FILE_MIME, type TCloudinaryOption } from '@beautinique/be-constants';
import { MIME_TO_FORMAT } from '@/constants';
import { AppError } from '@beautinique/be-classes';
import { getCloudinaryInstance } from '@/configs';

export const uploadVideoToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
  accountKey: TCloudinaryOption = 'video',
): Promise<UploadApiResponse> => {
  const cloudinary = getCloudinaryInstance(accountKey);

  const allowed_formats = FILE_MIME.VIDEO.map((mime) => MIME_TO_FORMAT.VIDEO[mime]);

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: generateFolderName(folder),
        resource_type: 'video',
        allowed_formats,
        use_filename: true,
        unique_filename: true,
        chunk_size: 6_000_000, // 6MB (approx) chunks (better for large files)
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

        // Optimized delivery URL
        const optimizedUrl = cloudinary.url(result.public_id, {
          resource_type: 'video',
          transformation: [{ width: 'auto' }, { quality: 'auto' }, { fetch_format: 'auto' }],
        });

        const thumbnail = cloudinary.url(result.public_id, {
          resource_type: 'video',
          transformation: [
            { start_offset: '2' },
            { width: 400, crop: 'scale' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        });

        const blurThumb = cloudinary.url(result.public_id, {
          resource_type: 'video',
          transformation: [
            { start_offset: '1' },
            { width: 50, crop: 'scale' },
            { fetch_format: 'auto' },
            { quality: 'auto:low' },
          ],
        });

        resolve({ ...result, secure_url: optimizedUrl, thumbnail, blurThumb });
      },
    );

    stream.end(file.buffer);
  });
};
