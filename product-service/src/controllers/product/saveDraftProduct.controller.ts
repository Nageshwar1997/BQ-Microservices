import type { Request, Response } from 'express';
import { redisCache } from '../../classes';
import type { TTryOnCategoryMap } from '../../types';
import { getUser } from '../../utils';

export interface TProductBasicInfo {
  title: string;
  brand: string;
  originalPrice: number;
  sellingPrice: number;
  l1Category: { _id: string; name: string };
  l2Category: { _id: string; name: string };
  l3Category: { _id: string; name: string };
}

export interface TProductMediaAndGallery {
  thumbnail: string;
  images: string[];
  video?: string;
}

export interface TProductDescriptionAndContent {
  shortDescription: string;
  description: string;
  instructions?: string;
  ingredients?: string;
  additional?: string;
}

export interface TProductWithoutVariant {
  hasVariants: false;
  stock: number;
  stockThreshold: number;
}

export interface TProductWithVariant {
  hasVariants: true;
  variants: {
    type: 'Color' | 'Text';
    label: string;
    value: string;
    originalPrice: number;
    sellingPrice: number;
    stock: number;
    stockThreshold: number;
    images: string[];
    thumbnail?: string;
  }[];
}

export type TProductStockAndVariants = TProductWithoutVariant | TProductWithVariant;

export type TProductTryOnConfiguration =
  | { enabled: false }
  | { enabled: true; tryOn: TTryOnCategoryMap };

export type TBody =
  | (TProductBasicInfo & { step: 0 })
  | (TProductMediaAndGallery & { step: 1 })
  | (TProductDescriptionAndContent & { step: 2 })
  | (TProductStockAndVariants & { step: 3 })
  | (TProductTryOnConfiguration & { step: 4 });

export interface TDraftProduct {
  basicInfo: TProductBasicInfo;
  mediaAndGallery: TProductMediaAndGallery;
  descriptionAndContent: TProductDescriptionAndContent;
  stockAndVariants: TProductStockAndVariants;
  tryOnConfiguration: TProductTryOnConfiguration;
}

export const saveDraftProductController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req);
  const body = req.body as TBody;

  const draft = await redisCache.dashboard.saveDraftProductStep(userId.toString(), body);

  return res.success(201, 'Product details saved in draft', { draft });
};
