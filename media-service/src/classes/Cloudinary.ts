import { logger } from '@/configs';
import { MIME_TO_FORMAT } from '@/constants';
import { envs } from '@/envs';
import type {
  ICloudinaryRemover,
  ICloudinaryUploader,
  IPublicIdOptions,
  TResourceType,
  TV2,
} from '@/types';
import { AppError } from '@beautinique/be-classes';
import { FILE_MIME, type TCloudinaryOption } from '@beautinique/be-constants';
import { type DeleteApiResponse, type UploadApiResponse, v2 } from 'cloudinary';
import { randomUUID } from 'crypto';

const DEFAULT_FOLDER_NAME = 'common_folder';
const FOLDER_SANITIZE_REGEX = /[&|/\\#?%]/g;

export class Cloudinary {
  /* ========== CLOUDINARY INSTANCE GETTER FUNCTION ========== */
  protected getCloudinary(accountKey: TCloudinaryOption) {
    // ☁️ Returns the configured Cloudinary instance for the given account
    v2.config({ ...envs.cloudinary[accountKey], secure: true });

    return v2;
  }

  /* ========== CLOUDINARY STATUS CHECKER FUNCTION ========== */
  protected async checkCloudinaryStatus(accountKey: TCloudinaryOption, cloudinary: TV2) {
    try {
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
  }

  /* ========== FOLDER NAME GENERATOR FUNCTION ========== */
  private generateFolderName(folder?: string) {
    // 🧹 Converts unsafe folder characters into safe underscores
    const sanitize = (str: string) => str.replace(FOLDER_SANITIZE_REGEX, '_');

    // 📁 Builds a clean subfolder name with a default fallback
    const subfolder = sanitize((folder || DEFAULT_FOLDER_NAME).trim().replace(/\s+/g, '_'));

    // 🏷️ Returns the final path with the main Cloudinary folder
    return `${envs.cloudinary.main_folder}/${subfolder}`;
  }

  /* ========== PUBLIC ID GENERATOR FUNCTION ========== */
  private generatePublicId({ entityKey, accountKey }: IPublicIdOptions): string {
    // 📅 Gets current date parts to build a structured public id
    const { getDate, getFullYear, getMonth } = new Date();

    const year = getFullYear();
    const month = String(getMonth() + 1).padStart(2, '0');
    const day = String(getDate()).padStart(2, '0');

    // 🆔 Generates a unique uuid for every upload
    const uuid = randomUUID();

    // 🧱 Creates the final public id using account, entity, date, and uuid
    return `${accountKey}/${entityKey}/${year}/${month}/${day}/${uuid}`;
  }

  /* ========== ALLOWED FORMAT RESOLVER FUNCTION ========== */
  private getAllowedFormats(resourceType: TResourceType) {
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
  }

  /* ========== FAILED ID EXTRACTOR FUNCTION ========== */
  protected getFailedIds(results: PromiseSettledResult<unknown>[], ids: string[]) {
    // 🚨 Collects only the ids whose operation failed
    return results.reduce<string[]>((acc, result, index) => {
      if (result.status === 'rejected') {
        acc.push(ids[index]);
      }

      return acc;
    }, []);
  }

  /* ========== SINGLE MEDIA CLOUDINARY UPLOADER FUNCTION ========== */
  protected uploader(props: ICloudinaryUploader) {
    // ☁️ Extracts the required Cloudinary properties
    const { accountKey, buffer, cloudinary, entityKey, folder, resourceType } = props;

    return new Promise<UploadApiResponse>((resolve, reject) => {
      // 🚀 Starts the stream-based upload
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: this.generateFolderName(folder),
          public_id: this.generatePublicId({ entityKey, accountKey }),
          resource_type: resourceType,
          allowed_formats: this.getAllowedFormats(resourceType),
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
      stream.end(buffer);
    });
  }

  protected remover({ publicId, cloudinary }: ICloudinaryRemover) {
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
  }
}
