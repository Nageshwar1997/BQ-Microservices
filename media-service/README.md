# Media Service

Handles media (image/video) upload, storage, and lifecycle for the Beautinique
platform. Uploads go straight to Cloudinary; MongoDB only tracks metadata and
usage state; BullMQ (Redis) drives every background/cleanup step so the HTTP
request returns as soon as the Cloudinary upload finishes.

## Tech stack

| Concern            | Package / Tool                                    |
| ------------------- | -------------------------------------------------- |
| HTTP framework      | Express 5                                           |
| Media storage        | Cloudinary                                          |
| Database             | MongoDB (Mongoose), via `@beautinique/backend-mongoose` |
| Background jobs      | BullMQ (Redis), via `@beautinique/backend-bullmq`    |
| Validation           | Zod, via `@beautinique/backend-zod`                 |
| File upload parsing  | Multer, via `@beautinique/backend-multer`           |
| Logging              | Pino, via `@beautinique/backend-logger`             |
| Shared response shape | `@beautinique/backend-response`                    |
| Shared constants/types | `@beautinique/shared-constants`, `@beautinique/shared-types` |

## Running locally

```bash
npm install
npm run dev          # tsc --noEmit --watch + nodemon, auto-restarts on src changes
```

Other scripts:

```bash
npm run build         # compile to dist/
npm run start          # node dist/index.js (run build first)
npm run start:dev      # build + start in one step
npm run lint            # eslint src
npm run lint:fix
```

Requires a `.env` file (see [Environment variables](#environment-variables)),
a reachable MongoDB instance, a reachable Redis instance (shared with the
other services that produce/consume `media-queue`/`mail-queue` jobs), and a
Cloudinary account.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port to listen on |
| `IS_DEV` | `'true'` enables pretty logging, stack traces in error responses, and dev URLs for downstream service links |
| `SERVICE_NAME` | Name tag attached to every log line |
| `SERVICE_SECRET` | Shared secret required in the `X-Service-Secret` header on every `/api/v1/*` request (see [Auth](#auth)) |
| `DATABASE_NAME` | MongoDB database name |
| `MONGODB_URI` | MongoDB connection string |
| `JOB_REDIS_HOST` / `JOB_REDIS_PORT` / `JOB_REDIS_PASSWORD` / `JOB_REDIS_USERNAME` | Redis connection used for BullMQ (**shared** across services - see [Cross-service queue integration](#cross-service-queue-integration)) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |
| `GATEWAY_DEV_URL` / `GATEWAY_PROD_URL` | API gateway URL (informational, exposed via `envs.url.gateway`) |
| `USER_SERVICE_*`, `MAIL_SERVICE_*`, `MEDIA_SERVICE_*` (`_DEV_URL`/`_PROD_URL`) | Sibling service base URLs (informational) |

## Auth model

Two independent layers, both enforced as middleware:

1. **Service-to-service** - every route under `/api/v1` requires a matching
   `X-Service-Secret` header (`checkServiceAccess`, [src/app.ts](src/app.ts)).
   This service is not meant to be called directly by browsers; only a
   trusted caller (typically the API gateway) should hold this secret.
2. **End user** - `authenticate` ([src/middlewares/index.ts](src/middlewares/index.ts))
   reads `X-User-Id` (required) and `X-User-Role` (defaults to `USER`) headers
   and attaches `req.user`. There's no JWT here - the gateway/upstream service
   is expected to have already authenticated the user and forwarded their
   identity via these headers.

`/` and `/health` are intentionally outside `/api/v1` and require neither -
they must stay reachable for load balancer / uptime checks even when the DB
or a downstream dependency is down.

## HTTP endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | none | This README, rendered as HTML |
| GET | `/docs` | none | Interactive API docs (Swagger UI, spec in [src/docs/openapi.ts](src/docs/openapi.ts)) |
| GET | `/health` | none | Liveness + Mongo connection status (`{ data: { database, service } }`) |
| POST | `/api/v1/upload/single` | service secret + user | Upload one file (field name `file`) |
| POST | `/api/v1/upload/multiple` | service secret + user | Upload several files (field name `files`) |

Both upload routes take a `folder` field in the multipart body
(`folderZodSchema` requires it; an empty/whitespace value falls back to
`common_folder`). Response shape on success:

```jsonc
// POST /api/v1/upload/single
{ "success": true, "message": "File uploaded successfully", "data": { "url": "https://res.cloudinary.com/..." } }

// POST /api/v1/upload/multiple
{ "success": true, "message": "Files uploaded successfully", "data": { "urls": ["https://...", "https://..."] } }
```

File constraints (enforced by `@beautinique/backend-multer` defaults, driven
by `@beautinique/shared-constants`): images up to 2 MB
(`IMAGE_MIMES`/`IMAGE_FORMATS`), videos up to 10 MB
(`VIDEO_MIMES`/`VIDEO_FORMATS`).

## End-to-end upload flow

```
Client / gateway
   │  POST /api/v1/upload/single  (X-Service-Secret, X-User-Id, multipart file+folder)
   ▼
checkServiceAccess → checkDbConnection → authenticate → validateMulter
   → checkEmptyRequest → validateZod(folderZodSchema) → controller
   ▼
Cloudinary.uploadSingle()          # streams the buffer straight to Cloudinary
   │  on failure: rethrows (nothing to roll back yet)
   ▼
jobProducer.addJob('media-queue', 'create-single-unused-media', payload)
jobProducer.addJob('media-queue', 'delete-single-media', { publicId }, { delay: CLEANUP_DELAY })
   │  on failure: rolls back the Cloudinary upload (cloudinary.removeSingle), rethrows
   ▼
res.success({ data: { url } })      # request returns here - DB write happens async
   .
   .  (async, inside WorkerManager's JobWorker for 'media-queue')
   ▼
'create-single-unused-media' handler → Media.create({ ..., status: UNUSED, expiresAt: now + CLEANUP_DELAY })
   .
   .  (CLEANUP_DELAY later, unless something marks it used first)
   ▼
'delete-single-media' handler → removes the Cloudinary asset, marks the Media doc DELETED
```

The multiple-file path is the same shape, batched: `uploadMultiple` uploads
all files in parallel and rolls back every successfully-uploaded file if any
one fails, `create-multiple-unused-media`/`delete-multiple-media` carry
arrays instead of single values, and job IDs are a deterministic hash of the
sorted `publicId`s (so retrying the same batch doesn't double-queue).

### Marking media as "used"

`media-service` never marks its own media as used - a **different** service
enqueues `mark-single-media-as-used` / `mark-multiple-media-as-used` onto
`media-queue` once it actually references the uploaded URL (e.g.
`product-service` does this in `publishDraftProductController` when a
product referencing the media is saved). That handler flips
`status: UNUSED → USED` and clears `expiresAt`, which is what keeps the media
from being auto-deleted by the cleanup job / TTL index.

## Background jobs (`media-queue`)

Owned and consumed by this service's `WorkerManager`
([src/classes/WorkerManager.ts](src/classes/WorkerManager.ts)), one BullMQ
`JobWorker` for the whole queue (concurrency 5, shared across all job names
below - not per-job like the old `be-jobs`-based implementation).

| Job name | Enqueued by | What it does |
| --- | --- | --- |
| `create-single-unused-media` / `create-multiple-unused-media` | this service (controllers) | Inserts `Media` doc(s) with `status: UNUSED` and an `expiresAt` |
| `delete-single-media` / `delete-multiple-media` | this service (controllers, delayed by `CLEANUP_DELAY`) | Removes the Cloudinary asset(s) and marks the doc(s) `DELETED`, if still `UNUSED` |
| `mark-single-media-as-used` / `mark-multiple-media-as-used` | other services (e.g. `product-service`) | Flips `status → USED`, clears `expiresAt` |
| `remove-single-media-directly` / `remove-multiple-media-directly` | this service (`Cloudinary` class, as a retry path) | Re-attempts a Cloudinary deletion that failed inline |

`media-service` only runs a worker for `media-queue`. `mail-queue` (used for
OTP emails) is owned end-to-end by `user-service` (producer) and
`mail-service` (worker) - unrelated to this service.

## Cross-service queue integration

Redis/BullMQ jobs are identified purely by queue name + job name at the
Redis level, so producers and consumers don't need to share a package
version - `product-service` currently enqueues `mark-multiple-media-as-used`
using the **older** `@beautinique/be-jobs` package, while this service
consumes it via the newer `@beautinique/backend-bullmq`. Both target the same
`media-queue` string on the same Redis instance, so it works, but it means:

- The `JOB_REDIS_*` env vars must point to the **same** Redis instance across
  every service that touches `media-queue`.
- If `media-queue`'s schema/job names ever change in `backend-bullmq`,
  `product-service` (and any other producer still on `be-jobs`) needs a
  matching update, or those jobs will silently stop being picked up.

## Data model (`Media`)

[src/models/index.ts](src/models/index.ts):

- `status`: `DRAFT | UNUSED | USED | DELETED` - new uploads start `UNUSED`.
- `expiresAt`: set on create (`UNUSED`) and on delete (`DELETED`); cleared
  when marked `USED`.
- A compound `{ status, expiresAt }` index for the cleanup queries, plus a
  single-field TTL index on `expiresAt` as a **backup** deletion path (see
  next section) - it does not remove the Cloudinary asset itself, only the
  MongoDB document.

## Graceful startup / shutdown

[src/bootstrap/startup.ts](src/bootstrap/startup.ts) /
[src/bootstrap/shutdown.ts](src/bootstrap/shutdown.ts), wired to
`SIGINT`/`SIGTERM` in [src/index.ts](src/index.ts):

- **Startup**: register Mongo event listeners → connect Mongo → start HTTP
  server → start the `media-queue` worker.
- **Shutdown**: stop accepting new HTTP requests → stop the worker → close
  the job producer → disconnect Mongo → destroy any lingering sockets →
  exit. Idempotent (safe to call more than once); every step's
  success/failure is logged individually via `Promise.allSettled`.

This service intentionally does **not** use `backend-bullmq`'s
`registerGracefulShutdown` helper - it already owns a full, ordered shutdown
sequence (HTTP server first, then jobs, then DB), and that helper registers
its *own* `SIGTERM`/`SIGINT` listeners + calls `process.exit()` itself, which
would race with the sequence above. It's meant for a process with no
existing shutdown orchestration of its own (e.g. a standalone worker script).

## Design notes / known trade-offs

- **TTL index is a backup, not the primary cleanup path.** The `expiresAt`
  TTL index (`expireAfterSeconds`) is set to `CLEANUP_DELAY` + a 1-day
  safety buffer (`TTL_SAFETY_BUFFER_SECONDS` in
  [src/constants/index.ts](src/constants/index.ts)), specifically so it
  fires well *after* the `delete-single-media`/`delete-multiple-media`
  BullMQ jobs (which are scheduled with exactly `CLEANUP_DELAY`, and also
  remove the actual Cloudinary asset). Without that buffer, Mongo's TTL
  monitor could delete the document before the BullMQ job runs, and the job
  would then find nothing to clean up - orphaning the Cloudinary asset
  forever, since the TTL sweep never touches Cloudinary itself.
- **Two overlapping retry mechanisms on Cloudinary deletion.** A failed
  removal is retried both by BullMQ's own `attempts`/`backoff` on the job
  *and* by the `Cloudinary` class's own `retryCount` re-queueing
  ([src/classes/Cloudinary.ts](src/classes/Cloudinary.ts)) after rethrowing.
  In practice this just means a stuck deletion gets retried more
  aggressively than either mechanism alone would - not incorrect, but worth
  knowing if you're tuning retry/backoff behavior.
- **`relatedTo` on `Media` is currently unused.** The schema has a
  `relatedTo: { service, entity }` field, but nothing in this service (or
  the `product-service` integration above) ever populates it.

## Recent fixes (this review pass)

- `checkDbConnection` was registered globally, ahead of `/` and `/health` -
  meaning the health endpoint couldn't respond at all while MongoDB was
  down, exactly backwards from its purpose. Scoped it to the `/api/v1`
  router only.
- Every `res.success(...)` call site (`app.ts`, `controllers/index.ts`) used
  a stale positional signature (`(statusCode, message, data)`) left over from
  an incomplete migration to `@beautinique/backend-response`, which actually
  takes a single options object. A conflicting local type declaration in
  `src/types/express.d.ts` hid this from the type-checker. At runtime this
  silently dropped every custom message *and* the entire `data` payload -
  including the uploaded file's `url`/`urls` in the upload responses.
  Removed the bad local type and switched every call site to
  `res.success({ statusCode, message, data })`.
- `SERVICE_NAMES_MAP.media` doesn't exist (the map's keys are the full
  service names, e.g. `'media-service'`) - it silently evaluated to
  `undefined`, so `/health`'s response was missing its `service` field.
  Fixed to `SERVICE_NAMES_MAP['media-service']`.
- Added a safety buffer to the `Media` TTL index so it can no longer race
  ahead of the BullMQ cleanup jobs (see above).
- Multer uploads didn't pass `limits.fileSize`, so an oversized upload was
  fully buffered into memory before the per-type size check rejected it.
  Added `limits: { fileSize: MAX_VIDEO_SIZE }` (the largest allowed type) for
  an earlier cutoff.
- Migrated the BullMQ integration from the retired `@beautinique/be-jobs`
  package to `@beautinique/backend-bullmq` (`JobProducer`/`JobWorker`).

All of the above were verified against a live run: `npm run dev`, hit `/`,
`/health`, and a real `POST /api/v1/upload/single` with a test image -
confirmed the Cloudinary upload, the correct JSON response shape, and the
`create-single-unused-media` background job completing and writing to
MongoDB.
