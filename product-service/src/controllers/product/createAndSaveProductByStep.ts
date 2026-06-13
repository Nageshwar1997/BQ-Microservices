import type { Request, Response } from 'express';
import { redisCache } from '../../classes';
import { getUser } from '../../utils';

export interface TProductBasicInfo {
  step: 0;
  title: string;
  brand: string;
  originalPrice: number;
  sellingPrice: number;
  l1Category: { id: string; name: string };
  l2Category: { id: string; name: string };
  l3Category: { id: string; name: string };
}

export interface TProductMediaAndGallery {
  step: 1;
  thumbnail: string;
  images: string[];
  video?: string;
}

export interface TProductDescriptionAndContent {
  step: 2;
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

export type TProductStockAndVariants = (TProductWithoutVariant | TProductWithVariant) & { step: 3 };

export type TProductTryOnConfiguration = (
  | {
      enabled: false;
    }
  | {
      enabled: true;
      tryon:
        | {
            type: 'LIP';
            subType: 'MATTE' | 'GLOSS' | 'SHIMMER' | 'CRAYON';
          }
        | {
            type: 'EYE';
            subType: 'EYEBROW' | 'EYELINER' | 'KAJAL' | 'EYESHADOW';
          }
        | {
            type: 'HAIR';
            subType: 'COLOR';
          }
        | {
            type: 'FACE';
            subType: 'CONCEALER' | 'FOUNDATION' | 'HIGHLIGHTER' | 'BLUSH';
          }
        | {
            type: 'NAIL';
            subType: 'GEL' | 'LIQUID';
          }
        | {
            type: 'SKIN';
            subType: 'MOISTURIZER' | 'SERUM' | 'TONER' | 'CLEANSER';
          };
    }
) & { step: 4 };

type TBody =
  | TProductBasicInfo
  | TProductMediaAndGallery
  | TProductDescriptionAndContent
  | TProductStockAndVariants
  | TProductTryOnConfiguration;

export interface TDraftProduct {
  basicInfo?: TProductBasicInfo;
  mediaAndGallery?: TProductMediaAndGallery;
  descriptionAndContent?: TProductDescriptionAndContent;
  stockAndVariants?: TProductStockAndVariants;
  tryOnConfiguration?: TProductTryOnConfiguration;
}

export const saveProductAsDraftController = async (req: Request, res: Response) => {
  const { _id: userId } = getUser(req);
  const body = req.body as TBody;

  const draft = await redisCache.saveDraftProductStep(userId.toString(), body);

  return res.success(201, 'Product details saved in draft', { draft });
};
