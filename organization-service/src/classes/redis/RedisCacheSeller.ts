import type {
  TSeller,
  TSellerDraftDetailsZodSchema,
  TSellerDraftStepBodyZodSchema,
} from '../../types/index.js';
import { RedisCacheHelper } from './RedisCacheHelper.js';

const SELLER_CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day

export class RedisCacheSeller extends RedisCacheHelper {
  private readonly DRAFT_SELLER_KEY = 'bq:sellers:draft';
  private readonly SELLER_KEY = 'bq:sellers:profile';

  /* ================= KEYS ================= */

  private getDraftSellerKey(userId: string) {
    return `${this.DRAFT_SELLER_KEY}:${userId}`;
  }

  private getSellerKey(id: string) {
    return `${this.SELLER_KEY}:${id}`;
  }

  /* ================= DRAFT SELLER (self-service onboarding wizard, keyed by userId) ================= */

  private async getDraftHashData(
    key: string,
  ): Promise<Partial<TSellerDraftDetailsZodSchema> | null> {
    const data = await this.getAllHashFields<TSellerDraftDetailsZodSchema>(key);

    if (Object.keys(data).length === 0) {
      return null;
    }

    return data;
  }

  public async getDraftSeller(userId: string) {
    return this.getDraftHashData(this.getDraftSellerKey(userId));
  }

  public async saveDraftSellerStep(userId: string, stepData: TSellerDraftStepBodyZodSchema) {
    const key = this.getDraftSellerKey(userId);

    const isNewDraft = !(await this.exists(key));

    await this.setHashData(
      key,
      stepData.step,
      stepData,
      isNewDraft ? SELLER_CACHE_TTL_SECONDS : undefined,
    );

    return this.getDraftHashData(key);
  }

  public async deleteDraftSeller(userId: string) {
    await this.deleteData(this.getDraftSellerKey(userId));
  }

  public async hasDraftSeller(userId: string) {
    return this.exists(this.getDraftSellerKey(userId));
  }

  /* ================= SELLER (persisted profile cache, keyed by seller id - warms admin + seller-profile reads) ================= */

  public async getSellerById(id: string) {
    return this.getData<TSeller>(this.getSellerKey(id));
  }

  public async setSeller(id: string, seller: TSeller) {
    await this.setData(this.getSellerKey(id), SELLER_CACHE_TTL_SECONDS, seller);
  }

  public async deleteSeller(id: string) {
    await this.deleteData(this.getSellerKey(id));
  }

  public async hasSeller(id: string) {
    return this.exists(this.getSellerKey(id));
  }
}
