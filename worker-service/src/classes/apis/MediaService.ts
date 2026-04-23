import { envs } from '@/envs';
import { ApiRequest } from './ApiRequest';

class MediaService extends ApiRequest {
  constructor() {
    super(`${envs.url.service.media}/media-service/api/v1`);
  }

  public async singleImageRemove(publicId: string) {
    await this.request({ ...this.routes.media.image.single.remove, data: { publicId } });
  }
}

export const mediaService = new MediaService();
