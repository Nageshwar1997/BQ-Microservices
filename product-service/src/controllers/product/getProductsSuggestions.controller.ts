import type { Request, Response } from 'express';
import { ROLES_MAP } from '../../constants';
import { Product } from '../../models';
import { getProductSuggestionsPipeline, getUser } from '../../utils';

export const getDashboardProductsSuggestionsController = async (req: Request, res: Response) => {
  const { search = '' } = req.query as { search?: string };

  const user = getUser(req);
  const query = search.trim();

  if (!query) {
    return res.success(200, 'Suggestions fetched successfully', { suggestions: [] });
  }

  const pipeline = getProductSuggestionsPipeline({
    query,
    sellerId: user.role === ROLES_MAP.SELLER ? user._id : undefined,
    includeShortDescription: false,
  });
  const suggestions = await Product.aggregate(pipeline);

  res.success(200, 'Suggestions fetched successfully', { suggestions });
};

export const getProductsSuggestionsController = async (req: Request, res: Response) => {
  const { search = '' } = req.query as { search?: string };

  const query = search.trim();

  if (!query) {
    return res.success(200, 'Suggestions fetched successfully', { suggestions: [] });
  }

  const pipeline = getProductSuggestionsPipeline({
    query,
    publishedOnly: true,
    includeShortDescription: true,
  });
  const suggestions = await Product.aggregate(pipeline);

  res.success(200, 'Suggestions fetched successfully', { suggestions });
};
