import type { Request, Response } from 'express';

import { Product } from '../../models/index.js';
import { getProductSuggestionsPipeline } from '../../utils/index.js';

export const getProductsSuggestionsController = async (req: Request, res: Response) => {
  const { search = '' } = req.query as { search?: string };

  const query = search.trim();

  if (!query) {
    res.success(200, 'Suggestions fetched successfully', { suggestions: [] });
    return;
  }

  const pipeline = getProductSuggestionsPipeline(query);

  const suggestions = await Product.aggregate(pipeline);

  res.success(200, 'Suggestions fetched successfully', { suggestions });
};
