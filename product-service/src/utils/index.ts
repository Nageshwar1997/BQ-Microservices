import { randomInt } from 'node:crypto';

import { UnprocessableEntityError } from '@beautinique/backend-classes';
import type { TProductStatus } from '@beautinique/backend-types';
import { PRODUCT_STATUSES, PRODUCT_STATUSES_MAP } from '@beautinique/shared-constants';
import { Types } from 'mongoose';
import slugify from 'slugify';

import type {
  IAutocompleteSearchOperator,
  ICategory,
  IGenerateSku,
  ITextSearchOperator,
  TCacheCategory,
  TId,
  TProduct,
} from '../types/index.js';

/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;
/* ========== NULL CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};

/* ========== OBJECT ID CONVERTER FUNCTION ========== */

export const toObjectId = (id: string): TId => {
  if (!Types.ObjectId.isValid(id)) {
    throw new UnprocessableEntityError('Invalid object id');
  }

  return new Types.ObjectId(id);
};

export const getObjId = (id: string | TId): TId => {
  return typeof id === 'string' ? toObjectId(id) : id;
};

/* ========== GENERATE SLUG ========== */
export const generateSlug = (text: string, unique = true) => {
  const slug = slugify(text, { lower: true, strict: true, trim: true });

  if (!unique) return slug;

  return `${slug}-${String(Date.now())}`;
};

export const getMinimalCategory = (category: ICategory): TCacheCategory => {
  const { _id, level, description, parent, name, slug } = category;
  const base = { _id: _id.toString(), name, slug };
  switch (level) {
    case 3: {
      return { ...base, level, parent: parent?.toString() ?? '', description: description ?? '' };
    }
    case 2: {
      return { ...base, level, parent: parent?.toString() ?? '' };
    }
    case 1:
    default: {
      return { ...base, level };
    }
  }
};

export const generateSku = ({ data, prefix, unique = true }: IGenerateSku) => {
  const sku = Object.values(data)
    .map((value) =>
      value
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 3)
        .toUpperCase(),
    )
    .filter(Boolean)
    .join('-');

  const finalSku = prefix ? `${prefix}-${sku}` : sku;

  if (!unique) {
    return finalSku;
  }

  const randomPart = randomInt(1, 1_000_000).toString().padStart(6, '0');

  return `${finalSku}-${randomPart}`;
};

export const getCloudinaryPublicIdFromUrl = (url: string): string => {
  try {
    const { pathname } = new URL(url);

    const match = /\/upload\/(?:[^/]+\/)*(?:v\d+\/)?(.+)$/.exec(pathname);

    if (!match?.[1]) {
      throw new UnprocessableEntityError('Invalid URL.');
    }

    return match[1].replace(/\.[^/.]+$/, '');
  } catch {
    throw new UnprocessableEntityError('Invalid URL.');
  }
};

export const extractImageUrlsFromHtml = (html: string): string[] => {
  return [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((url): url is string => Boolean(url));
};

export const getProductSuggestionsPipeline = (query: string) => {
  const should: (
    | IAutocompleteSearchOperator<keyof Pick<TProduct, 'title' | 'brand' | 'slug'>>
    | ITextSearchOperator<keyof Pick<TProduct, 'shortDescription'>>
  )[] = [
    { autocomplete: { query, path: 'brand', score: { boost: { value: 5 } } } },
    { autocomplete: { query, path: 'slug', score: { boost: { value: 2 } } } },
    {
      text: {
        query,
        path: 'shortDescription',
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 1 } },
      },
    },
  ];

  const must: IAutocompleteSearchOperator<keyof Pick<TProduct, 'title'>>[] = [
    {
      autocomplete: {
        query,
        path: 'title',
        tokenOrder: 'sequential',
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 10 } },
      },
    },
  ];

  return [
    { $search: { index: 'product-search', compound: { must, should } } },
    { $match: { status: PRODUCT_STATUSES_MAP.PUBLISHED } },
    { $project: { _id: 1, title: 1, slug: 1, thumbnail: 1, brand: 1 } },
    { $limit: 5 },
  ];
};

export const getInitialProductCountsByStatus = (): Record<TProductStatus | 'ALL', number> =>
  ([...PRODUCT_STATUSES, 'ALL'] as const).reduce<Record<TProductStatus | 'ALL', number>>(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<TProductStatus | 'ALL', number>,
  );

export const populateProductCountsByStatus = (
  counts: Record<TProductStatus | 'ALL', number>,
  statusCounts: { _id: TProductStatus; count: number }[],
): Record<TProductStatus | 'ALL', number> => {
  for (const item of statusCounts) {
    counts.ALL += item.count;
    counts[item._id] = item.count;
  }

  return counts;
};
