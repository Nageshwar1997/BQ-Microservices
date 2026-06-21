import type { Request, Response } from 'express';
import { Product } from '../../models';
import { getProductSuggestionsPipeline } from '../../utils';

export const getProductsSuggestionsController = async (req: Request, res: Response) => {
  const { search = '' } = req.query as { search?: string };

  const query = search.trim();

  if (!query) {
    return res.success(200, 'Suggestions fetched successfully', { suggestions: [] });
  }

  const pipeline = getProductSuggestionsPipeline(query);
  
  const suggestions = await Product.aggregate(pipeline);

  res.success(200, 'Suggestions fetched successfully', { suggestions });
};
