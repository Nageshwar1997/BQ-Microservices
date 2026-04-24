import { envs } from '@/envs';
import { ApiRequest } from './ApiRequest';
import type { IBaseMedia } from '@/types';

class MediaService extends ApiRequest {
  constructor() {
    super(`${envs.url.service.media}/media-service/api/v1`);
  }

  public async singleImageRemove(publicId: string) {
    return await this.request({ ...this.routes.media.image.single.remove, data: { publicId } });
  }

  public async createSingleMedia(data: IBaseMedia) {
    return await this.request({ ...this.routes.media.media.create.single, data });
  }
}

export const mediaService = new MediaService();
