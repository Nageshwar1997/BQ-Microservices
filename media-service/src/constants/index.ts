export const HEADERS_KEYS = {
  serviceSecret: 'X-Service-Secret',
  userId: 'X-User-Id',
  userRole: 'X-User-Role',
} as const;

export const FILE_MIME = {
  image: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'image/svg+xml',
    'image/avif',
    'image/gif',
    'image/heic',
    'image/heif',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/quicktime', // mov
    'video/x-matroska', // mkv
    'video/matroska', // mkv
    'video/ogg', // ogg
    'application/vnd.apple.mpegurl', // m3u8
    'application/x-mpegURL', // m3u8 fallback
  ],
} as const;

export const FILE_EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'heic', 'heif'],
  video: ['mp4', 'webm', 'mov', 'mkv', 'ogg', 'm3u8'],
} as const;

export const METHOD_MAP = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
} as const;

export const METHODS_AND_PATHS = {
  base: '/api/v1',
  upload: {
    base: '/upload',
    single: { method: METHOD_MAP.POST, path: '/single' },
    multiple: { method: METHOD_MAP.POST, path: '/multiple' },
  },
} as const;

const MINUTE = 60 * 1000;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export const CLEANUP_DELAY = 2 * DAY;
