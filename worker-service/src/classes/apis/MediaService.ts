import { envs } from '@/envs';
import { ApiRequest } from './ApiRequest';
import type { IBaseMedia, TResourceType } from '@/types';

class MediaService extends ApiRequest {
  constructor() {
    super(`${envs.url.service.media}/media-service/api/v1`);
  }

  // Cloudinary Workers
  public async singleMediaRemove(data: { publicId: string; resourceType: TResourceType }) {
    return await this.request({ ...this.routes.media.cloudinary_remove.single, data });
  }

  public async multipleMediaRemove(data: {
    publicIds: string[];
    resourceType: TResourceType;
    retryCount?: number;
  }) {
    return await this.request({ ...this.routes.media.cloudinary_remove.multiple, data });
  }

  // Database Workers
  public async createUnusedSingleMedia(data: IBaseMedia) {
    return await this.request({ ...this.routes.media.mark_as_unused.single, data });
  }

  public async createUnusedMultipleMedia(data: IBaseMedia) {
    return await this.request({ ...this.routes.media.mark_as_unused.multiple, data });
  }

  public async markAsUsedSingleMedia(data: Partial<IBaseMedia>) {
    return await this.request({ ...this.routes.media.mark_as_used.single, data });
  }

  public async markAsUsedMultipleMedia(data: Partial<IBaseMedia>) {
    return await this.request({ ...this.routes.media.mark_as_used.multiple, data });
  }

  public async markAsDeletedSingleMedia(data: Partial<IBaseMedia>) {
    return await this.request({ ...this.routes.media.mark_as_deleted.single, data });
  }

  public async markAsDeletedMultipleMedia(data: Partial<IBaseMedia>) {
    return await this.request({ ...this.routes.media.mark_as_deleted.multiple, data });
  }
}

export const mediaService = new MediaService();
