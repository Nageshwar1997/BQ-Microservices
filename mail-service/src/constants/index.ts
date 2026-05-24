export const METHOD_MAP = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  home: { method: METHOD_MAP.GET, path: '/' },
  health: { method: METHOD_MAP.GET, path: '/health' },
} as const;
