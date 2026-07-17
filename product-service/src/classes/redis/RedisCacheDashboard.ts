import { DRAFT_PRODUCT_STEP_MAP } from '@beautinique/shared-constants';
import { parseData } from '@beautinique/shared-utils';

import type { TBody, TDraftProduct } from '../../controllers/index.js';
import type { DashboardCacheProduct } from '../../types/index.js';
import { RedisCacheHelper } from './RedisCacheHelper.js';

export class RedisCacheDashboard extends RedisCacheHelper {
  private readonly ONE_DAY_TTL = 60 * 60 * 24;
  private readonly DRAFT_PRODUCT_KEY = 'bq:products:draft';
  private readonly DASHBOARD_PRODUCT_KEY = 'bq:products:dashboard:product';

  /* ================= KEYS ================= */

  private getDraftProductKey(userId: string) {
    return `${this.DRAFT_PRODUCT_KEY}:${userId}`;
  }

  private getProductKey(slug: string) {
    return `${this.DASHBOARD_PRODUCT_KEY}:${slug}`;
  }

  /* ================= DRAFT PRODUCT ================= */

  private async getDraftHashData(key: string): Promise<Partial<TDraftProduct> | null> {
    const data = await this.getAllHashFields<string>(key);

    if (Object.keys(data).length === 0) {
      return null;
    }

    return {
      basicInfo: data.basicInfo ? (parseData(data.basicInfo) ?? undefined) : undefined,
      mediaAndGallery: data.mediaAndGallery
        ? (parseData(data.mediaAndGallery) ?? undefined)
        : undefined,
      descriptionAndContent: data.descriptionAndContent
        ? (parseData(data.descriptionAndContent) ?? undefined)
        : undefined,
      stockAndVariants: data.stockAndVariants
        ? (parseData(data.stockAndVariants) ?? undefined)
        : undefined,
      tryOnConfiguration: data.tryOnConfiguration
        ? (parseData(data.tryOnConfiguration) ?? undefined)
        : undefined,
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

  /* ================= PRODUCT ================= */

  public async getProductBySlug(slug: string) {
    return this.getData<DashboardCacheProduct>(this.getProductKey(slug));
  }

  public async setProductBySlug(slug: string, product: DashboardCacheProduct) {
    await this.setData(this.getProductKey(slug), this.ONE_DAY_TTL, product);
  }

  public async deleteProductBySlug(slug: string) {
    await this.deleteData(this.getProductKey(slug));
  }

  public async hasProductBySlug(slug: string) {
    return this.exists(this.getProductKey(slug));
  }
}
