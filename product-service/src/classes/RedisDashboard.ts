import { parseData } from '@beautinique/be-utils';
import { DRAFT_PRODUCT_STEP_MAP } from '../constants';
import type { TBody, TDraftProduct } from '../controllers/product/saveDraftProduct.controller';
import { RedisHelper } from './RedisHelper';

export class RedisDashboard extends RedisHelper {
  private readonly ONE_DAY_TTL = 60 * 60 * 24;
  private readonly KEY_PREFIX = {
    DRAFT_PRODUCT: 'bq:draft-product',
  };

  private getDraftProductKey(userId: string) {
    return `${this.KEY_PREFIX.DRAFT_PRODUCT}:${userId}`;
  }

  private async getDraftHashData(key: string): Promise<Partial<TDraftProduct> | null> {
    const data = await this.getAllHashFields<string>(key);

    if (Object.keys(data).length === 0) {
      return null;
    }

    return {
      basicInfo: data.basicInfo ? parseData(data.basicInfo) : undefined,
      mediaAndGallery: data.mediaAndGallery ? parseData(data.mediaAndGallery) : undefined,
      descriptionAndContent: data.descriptionAndContent
        ? parseData(data.descriptionAndContent)
        : undefined,
      stockAndVariants: data.stockAndVariants ? parseData(data.stockAndVariants) : undefined,
      tryOnConfiguration: data.tryOnConfiguration ? parseData(data.tryOnConfiguration) : undefined,
    };
  }

  public async getDraftProduct(userId: string) {
    return this.getDraftHashData(this.getDraftProductKey(userId));
  }

  public async saveDraftProductStep(userId: string, stepData: TBody) {
    const key = this.getDraftProductKey(userId);

    const isNewDraft = !(await this.exists(key));

    const { step, ...data } = stepData;

    const field: keyof TDraftProduct = DRAFT_PRODUCT_STEP_MAP[step];

    await this.setHashData(key, field, data, isNewDraft ? this.ONE_DAY_TTL : undefined);

    return this.getDraftHashData(key);
  }

  public async deleteDraftProduct(userId: string) {
    await this.deleteData(this.getDraftProductKey(userId));
  }

  public async hasDraftProduct(userId: string) {
    return this.exists(this.getDraftProductKey(userId));
  }
}
