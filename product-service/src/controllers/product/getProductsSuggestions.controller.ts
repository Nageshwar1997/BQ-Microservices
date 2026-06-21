import { AppError } from '@beautinique/be-classes';
import type { Request, Response } from 'express';
import { HEADERS_KEYS } from '../../constants';
import { Product } from '../../models';
import type { TProductSearchOperator } from '../../types';

export const getProductsSuggestionsController = async (req: Request, res: Response) => {
  const { search = '', scope = 'public' } = req.query as {
    search?: string;
    scope?: 'public' | 'management';
  };

  const query = search.trim();

  if (!query) {
    return res.success(200, 'Suggestions fetched successfully', { data: [] });
  }

  if (scope === 'management') {
    const userId = req.get(HEADERS_KEYS.userId);

    if (!userId) {
      throw new AppError({
        message: 'You are not authorized to perform this action',
        code: 'AUTHORIZATION_ERROR',
      });
    }
  }

  const should: TProductSearchOperator[] = [
    {
      autocomplete: {
        query,
        path: 'title',
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 10 } },
      },
    },
    {
      autocomplete: {
        query,
        path: 'brand',
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 5 } },
      },
    },
    {
      autocomplete: { query, path: 'slug', fuzzy: { maxEdits: 1 }, score: { boost: { value: 2 } } },
    },
  ];

  if (scope === 'public') {
    should.push({
      text: {
        query,
        path: 'shortDescription',
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 1 } },
      },
    });
  }

  const suggestions = await Product.aggregate([
    { $search: { index: 'product-search', compound: { should, minimumShouldMatch: 1 } } },
    ...(scope === 'public' ? [{ $match: { status: 'PUBLISHED' } }] : []),
    {
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        thumbnail: 1,
        brand: 1,
        status: 1,
        score: { $meta: 'searchScore' },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 5 },
  ]);

  res.success(200, 'Suggestions fetched successfully', { data: suggestions });
};
