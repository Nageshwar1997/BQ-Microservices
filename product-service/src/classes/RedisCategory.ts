import { logger } from '../configs';
import { Category } from '../models';
import type { ICategory, TCacheCategory } from '../types';
import { getMinimalCategory } from '../utils';
import { RedisHelper } from './RedisHelper';

export class RedisCategory extends RedisHelper {
  private readonly KEY = 'bq:categories';

  public async getAllCategories(): Promise<TCacheCategory[]> {
    // 1. Try Redis
    const categories = await this.getHashData<TCacheCategory>(this.KEY);

    if (categories.length > 0) {
      return categories;
    }

    // 2. Fallback to DB
    return this.seedCategoriesCache();
  }

  public async setCategory(category: ICategory) {
    await this.setHashData(this.KEY, category._id.toString(), getMinimalCategory(category));
  }

  public async deleteCategory(categoryId: string) {
    await this.deleteHashField(this.KEY, categoryId);
  }

  private async seedCategoriesCache(): Promise<TCacheCategory[]> {
    const categories = await Category.find()
      .select('_id name slug parent level description')
      .sort({ level: 1, slug: 1 })
      .lean()
      .exec();

    const minimalCategories = categories.map(getMinimalCategory);

    await Promise.all(
      minimalCategories.map((category) => this.setHashData(this.KEY, category._id, category)),
    );

    logger.info('📦 Categories cache seeded from DB');

    return minimalCategories;
  }
}
