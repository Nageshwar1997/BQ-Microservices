# Media Service — Documentation

**Project:** Beautinique (BQ-Microservices)
**Service:** Media Service
**Author:** Nageshwar Pawar
**Version:** 1.0.0
**Port:** configured via `PORT` (see [§4](#4-environment-variables))

---

## 1. Overview

The Media Service is the central media-handling microservice for the **Beautinique** platform. It accepts single/multiple image and video uploads, streams them straight to Cloudinary, and tracks their lifecycle (`UNUSED → USED → DELETED`) in MongoDB. Every write-side effect that isn't the upload itself — creating the tracking record, scheduling cleanup, retrying failed deletions — runs asynchronously through BullMQ (Redis) so the HTTP request returns as soon as the Cloudinary upload finishes. It also serves its own documentation: `GET /` renders this README as HTML, and `GET /docs` serves an interactive Swagger UI.

---

## 2. Technology Stack

| Layer                    | Technology                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Runtime                  | Node.js (ES2025, ESM)                                                                      |
| Language                 | TypeScript 6.x (`strict`, `noUncheckedIndexedAccess`, `noEmitOnError`)                     |
| Framework                | Express.js 5.x                                                                             |
| Database                 | MongoDB (via Mongoose 9.x, `@beautinique/backend-mongoose`)                                |
| Media storage            | Cloudinary                                                                                 |
| Background jobs / queue  | BullMQ (Redis), via `@beautinique/backend-bullmq`                                          |
| Validation               | Zod, via `@beautinique/backend-zod`                                                        |
| File upload parsing      | Multer, via `@beautinique/backend-multer`                                                  |
| Logging                  | Pino, via `@beautinique/backend-logger`                                                    |
| API docs                 | OpenAPI 3.0 spec (hand-written) + `swagger-ui-express`                                     |
| README rendering         | `@beautinique/shared-markdown-to-html` (markdown → HTML)                                   |
| Shared response envelope | `@beautinique/backend-response`                                                            |
| Shared utilities         | `@beautinique/backend-utils`, `@beautinique/shared-utils`                                  |
| Shared constants/types   | `@beautinique/shared-constants`, `@beautinique/shared-types`, `@beautinique/backend-types` |
| Code quality             | ESLint (flat config, type-checked + strict), Prettier                                      |

---

## 3. Project Structure

```
media-service/
├── src/
│   ├── index.ts                     # Entry point: loads env, wires SIGINT/SIGTERM, calls startup()
│   ├── app.ts                       # Express app: middleware chain, routes, error handlers
│   ├── bootstrap/                   # Startup/shutdown orchestration
│   │   ├── startup.ts               #   Mongo → HTTP server → worker, in order
│   │   ├── shutdown.ts              #   HTTP server → worker → job producer → Mongo, in order
│   │   ├── server.ts                #   Low-level HTTP server lifecycle + connection tracking
│   │   └── database-events.ts       #   Mongo connection event → logger wiring
│   ├── classes/
│   │   ├── index.ts                 #   Re-exports
│   │   ├── Cloudinary.ts            #   Upload/remove logic, retry-via-queue on failure
│   │   └── WorkerManager.ts         #   Owns the media-service-queue BullMQ JobWorker
│   ├── configs/
│   │   └── index.ts                 #   Singletons: databaseConfigs, logger, jobProducer, workerManager
│   ├── constants/
│   │   └── index.ts                 #   Route paths, CLEANUP_DELAY, TTL_SAFETY_BUFFER_SECONDS
│   ├── controllers/
│   │   └── index.ts                 #   singleMediaUploadController, multipleMediaUploadController
│   ├── docs/
│   │   └── openapi.ts               #   Hand-written OpenAPI 3.0 spec, served at /docs
│   ├── envs/
│   │   └── index.ts                 #   process.env → typed envs, fail-fast on missing/invalid vars
│   ├── middlewares/
│   │   └── index.ts                 #   authenticate, authorize
│   ├── models/
│   │   └── index.ts                 #   Media schema (Mongoose)
│   ├── routes/
│   │   ├── index.ts                 #   Root router (/api/v1), mounts authenticate + uploadRouter
│   │   └── upload.route.ts          #   /upload/single, /upload/multiple
│   ├── types/
│   │   ├── index.ts                 #   IMedia, IUploader, IRemover, etc.
│   │   └── express.d.ts             #   Request.user augmentation
│   └── utils/
│       └── index.ts                 #   generateBaseMediaPayload
├── scripts/
│   └── generate-html.mjs            # Renders README.md → public/index.html (@beautinique/shared-markdown-to-html), runs via "postbuild"
├── public/
│   └── index.html                   # Pre-rendered README, served by GET /
├── dist/                            # Compiled JavaScript output (git-ignored)
├── logs/                            # error.log, warning.log, success.log, request.log
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── .env
```

---

## 4. Environment Variables

All environment variables are loaded via `dotenv` and validated in `src/envs/index.ts` — every required variable is checked with `requireEnv`/`requirePort` at startup, so a missing or invalid value throws a clear `Missing required environment variable: X` error immediately instead of failing confusingly later.

### 4.1 Server & App

| Variable         | Required | Description                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------ |
| `PORT`           | Yes      | HTTP port to listen on (must be a positive integer)                                  |
| `NODE_ENV`       | No       | `"development"` enables pretty logging and stack traces in error responses           |
| `SERVICE_NAME`   | Yes      | Name tag attached to every log line                                                  |
| `SERVICE_SECRET` | Yes      | Shared secret required in the `X-Service-Secret` header on every `/api/v1/*` request |
| `DATABASE_NAME`  | Yes      | MongoDB database name                                                                |

### 4.2 MongoDB

| Variable      | Required | Description               |
| ------------- | -------- | ------------------------- |
| `MONGODB_URI` | Yes      | MongoDB connection string |

### 4.3 Redis — BullMQ

| Variable           | Required | Description                                                     |
| ------------------ | -------- | --------------------------------------------------------------- |
| `BULL_MQ_HOST`     | Yes      | Redis host used for the `media-service-queue` BullMQ connection |
| `BULL_MQ_PORT`     | Yes      | Redis port (must be a positive integer)                         |
| `BULL_MQ_PASSWORD` | No       | Redis password, if the instance requires auth                   |
| `BULL_MQ_USERNAME` | No       | Redis username, if the instance requires auth                   |

**This Redis instance is shared** across every service that produces or consumes `media-service-queue` jobs (see [§10 Cross-service queue integration](#10-background-jobs-media-service-queue)) — it must point to the same instance everywhere.

### 4.4 Cloudinary

| Variable                | Required | Description           |
| ----------------------- | -------- | --------------------- |
| `CLOUDINARY_CLOUD_NAME` | Yes      | Cloudinary cloud name |
| `CLOUDINARY_API_KEY`    | Yes      | Cloudinary API key    |
| `CLOUDINARY_API_SECRET` | Yes      | Cloudinary API secret |

---

## 5. Database Models

### 5.1 Media Schema (`models/index.ts`)

Collection: `medias` (Mongoose default, pluralized from `Media`)

| Field          | Type          | Required | Default    | Notes                                                                   |
| -------------- | ------------- | -------- | ---------- | ----------------------------------------------------------------------- |
| `publicId`     | String        | Yes      | —          | Cloudinary public ID, unique                                            |
| `url`          | String        | Yes      | —          | Optimized Cloudinary URL (`f_auto,q_auto`), unique                      |
| `resourceType` | String (enum) | Yes      | —          | `image` \| `video` (`MEDIA_RESOURCES`), indexed                         |
| `userId`       | ObjectId      | Yes      | —          | Uploader's user id                                                      |
| `relatedTo`    | Object        | No       | —          | `{ service, entity }` — **currently unused**, no code populates it      |
| `expiresAt`    | Date          | No       | —          | Set on create (`UNUSED`) and on delete (`DELETED`); cleared when `USED` |
| `deletedAt`    | Date          | No       | —          | Indexed                                                                 |
| `status`       | String (enum) | No       | `"UNUSED"` | `DRAFT` \| `UNUSED` \| `USED` \| `DELETED` (`MEDIA_STATUSES`), indexed  |
| `metadata`     | Mixed         | No       | —          | `{ width, height, format, size, folder }` from the Cloudinary response  |

Also has `timestamps: true` (`createdAt`/`updatedAt`), `versionKey: false`.

**Indexes:**
- `{ publicId: 1 }` unique (schema-level)
- `{ url: 1 }` unique (schema-level)
- `{ resourceType: 1 }`
- `{ deletedAt: 1 }`
- `{ status: 1 }`
- `{ status: 1, expiresAt: 1 }` compound (cleanup queries)
- `{ expiresAt: 1 }` **TTL index** — `expireAfterSeconds: TTL_SAFETY_BUFFER_SECONDS` (1 day). This is a **backup** deletion path, not the primary one — see [§14 Design notes](#14-design-notes--known-trade-offs).

### 5.2 Status Lifecycle

```
                 create-*-unused-media                delete-*-media
  (upload)  ───────────────────────────►  UNUSED  ───────────────────────►  DELETED
                                             │        (after CLEANUP_DELAY,
                                             │         only if still UNUSED)
                                             │ mark-*-media-as-used
                                             ▼               (enqueued by another
                                            USED                service, e.g.
                                                                 product-service)
```

---

## 6. API Routes

### 6.1 Home & Health & Docs

| Method | Path      | Auth | Description                                                      |
| ------ | --------- | ---- | ---------------------------------------------------------------- |
| GET    | `/`       | None | This README, pre-rendered to HTML by `scripts/generate-html.mjs` |
| GET    | `/docs`   | None | Interactive Swagger UI (spec in `src/docs/openapi.ts`)           |
| GET    | `/health` | None | Liveness + Mongo connection status + worker running state        |

`/`, `/docs`, and `/health` are intentionally outside `/api/v1` and require neither the service secret nor a user — they must stay reachable for uptime checks even when the DB or a downstream dependency is down.

### 6.2 Upload Routes — `/api/v1/upload` (service secret + user required)

| Method | Path                      | Field name | Description                          |
| ------ | ------------------------- | ---------- | ------------------------------------ |
| POST   | `/api/v1/upload/single`   | `file`     | Upload one image or video            |
| POST   | `/api/v1/upload/multiple` | `files`    | Upload several images/videos at once |

Both take a `folder` field in the multipart body (`folderZodSchema` requires it; an empty/whitespace value falls back to `common_folder`).

**Success response shape:**

```jsonc
// POST /api/v1/upload/single  →  201
{ "success": true, "message": "File uploaded successfully", "data": "https://res.cloudinary.com/.../sample.jpg" }

// POST /api/v1/upload/multiple  →  201
{ "success": true, "message": "Files uploaded successfully", "data": ["https://res.cloudinary.com/.../a.jpg", "https://res.cloudinary.com/.../b.mp4"] }
```

**File constraints** (enforced by `@beautinique/backend-multer` defaults via `@beautinique/shared-constants`, plus an early `limits.fileSize` cutoff at the largest allowed size):

| Type  | Max size | Allowed MIME types                                                              | Allowed extensions                                                 |
| ----- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Image | 2 MB     | `image/jpeg`, `png`, `webp`, `jpg`, `svg+xml`, `avif`, `gif`, `heic`, `heif`    | `jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`, `svg`, `heic`, `heif` |
| Video | 10 MB    | `video/mp4`, `webm`, `quicktime`, `x-matroska`, `matroska`, `ogg`, HLS variants | `mp4`, `webm`, `mov`, `mkv`, `ogg`, `m3u8`                         |

---

## 7. Request Headers

| Header             | Purpose                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `X-Service-Secret` | Service-to-service authentication (`checkServiceAccess`, required on `/api/v1/*`) |
| `X-User-Id`        | End user's id (forwarded by the gateway/caller, required on `/api/v1/*`)          |
| `X-User-Role`      | End user's role, defaults to `USER` if not sent                                   |

There's no JWT here — the gateway/upstream service is expected to have already authenticated the user and forwarded their identity via `X-User-Id`/`X-User-Role`.

---

## 8. Upload Flow

### 8.1 Single Upload (`POST /api/v1/upload/single`)

```
Client / gateway
   │  POST /api/v1/upload/single  (X-Service-Secret, X-User-Id, multipart file+folder)
   ▼
checkServiceAccess → checkDbConnection → authenticate → validateMulter
   → checkEmptyRequest → validateZod(folderZodSchema) → controller
   ▼
cloudinary.uploadSingle()          # streams the buffer straight to Cloudinary
   │  on failure: rethrows (nothing to roll back yet)
   ▼
res.locals.afterRollback.push(...)  # registers a Cloudinary-cleanup task, in case anything below fails
   ▼
jobProducer.addJob('media-service-queue', 'create-single-unused-media', payload)
jobProducer.addJob('media-service-queue', 'delete-single-media', { publicId }, { delay: CLEANUP_DELAY })
   │  on failure: tryCatchResponse runs afterRollback (removes the Cloudinary upload), forwards the error
   ▼
res.success({ statusCode: 201, data: url })   # request returns here - DB write happens async
   .
   .  (async, inside WorkerManager's JobWorker for 'media-service-queue')
   ▼
'create-single-unused-media' handler → Media.create({ ..., status: UNUSED, expiresAt: now + CLEANUP_DELAY })
   .
   .  (CLEANUP_DELAY later, unless something marks it used first)
   ▼
'delete-single-media' handler → removes the Cloudinary asset, marks the Media doc DELETED
```

### 8.2 Multiple Upload (`POST /api/v1/upload/multiple`)

Same shape, batched: `cloudinary.uploadMultiple` uploads all files in parallel and rolls back every successfully-uploaded file if any *one* fails (all-or-nothing), `create-multiple-unused-media`/`delete-multiple-media` carry arrays instead of single values, and job IDs are a deterministic MD5 hash of the sorted `publicId`s — so retrying the same batch doesn't double-queue.

### 8.3 Rollback Mechanism

Both controllers use `res.locals.afterRollback` (provided by `@beautinique/backend-response`'s `tryCatchResponse`) instead of manual `try/catch`:

- The rollback task (delete the just-uploaded Cloudinary asset) is registered **before** the job-queueing calls.
- If `jobProducer.addJob(...)` throws, `tryCatchResponse` automatically runs every queued `afterRollback` task, then forwards the error to `errorResponse` — the client gets a proper error instead of a false "success".
- If a Cloudinary deletion *itself* fails during rollback, it's logged (`Failed to rollback uploaded ... media`), not re-thrown — the original upload error still reaches the client.

### 8.4 Marking Media as "Used"

`media-service` never marks its own media as used — a **different** service enqueues `mark-single-media-as-used` / `mark-multiple-media-as-used` onto `media-service-queue` once it actually references the uploaded URL (e.g. `product-service` does this in `publishDraftProductController` when a product referencing the media is saved). That handler flips `status: UNUSED → USED` and clears `expiresAt`, which is what keeps the media from being auto-deleted by the cleanup job / TTL index.

---

## 9. Middlewares

### `authenticate` (`middlewares/index.ts`)

Reads `X-User-Id` (throws `AuthenticationError` if missing) and `X-User-Role` (defaults to `USER`), attaches `{ _id, role }` to `req.user`. Mounted in front of every route in `routes/index.ts`.

### `authorize(allowedRoles)` (`middlewares/index.ts`)

Factory middleware — same header extraction as `authenticate`, plus throws `AuthorizationError` if `req.user.role` isn't in `allowedRoles`. Exported but **not currently wired into any route**.

### External Middlewares (from `@beautinique/*` packages)

| Middleware           | Package                         | Purpose                                                                                |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `checkServiceAccess` | `@beautinique/backend-request`  | Validates `X-Service-Secret`, timing-safe compare                                      |
| `checkDbConnection`  | `@beautinique/backend-mongoose` | Rejects with 503 if MongoDB isn't ready (scoped to `/api/v1` only)                     |
| `checkEmptyRequest`  | `@beautinique/backend-request`  | Guards against empty body/file(s) before validation                                    |
| `validateMulter`     | `@beautinique/backend-multer`   | Multer wrapper: file type/size validation with structured errors                       |
| `validateZod`        | `@beautinique/backend-zod`      | Request body validation via Zod (`folderZodSchema`)                                    |
| `tryCatchResponse`   | `@beautinique/backend-response` | Wraps controller; provides `res.locals.afterResponse/afterRollback/afterFinish`        |
| `successResponse`    | `@beautinique/backend-response` | Attaches `res.success({ statusCode, message, data })`                                  |
| `notFoundResponse`   | `@beautinique/backend-response` | 404 handler (branded HTML page for browser requests)                                   |
| `errorResponse`      | `@beautinique/backend-response` | Central error handler; `{ success:false, code, message, fieldErrors?, globalErrors? }` |
| `createHttpLogger`   | `@beautinique/backend-logger`   | Per-request Pino logging                                                               |

---

## 10. Background Jobs (`media-service-queue`)

Owned and consumed by `WorkerManager` (`classes/WorkerManager.ts`) — a single BullMQ `JobWorker` for the whole queue (concurrency 5, shared across every job name below, not one worker per job name).

| Job name                                                          | Enqueued by                                                     | What it does                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `create-single-unused-media` / `create-multiple-unused-media`     | this service (controllers)                                      | Inserts `Media` doc(s) with `status: UNUSED` and an `expiresAt`                   |
| `delete-single-media` / `delete-multiple-media`                   | this service (controllers, delayed by `CLEANUP_DELAY` = 2 days) | Removes the Cloudinary asset(s) and marks the doc(s) `DELETED`, if still `UNUSED` |
| `mark-single-media-as-used` / `mark-multiple-media-as-used`       | other services (e.g. `product-service`)                         | Flips `status → USED`, clears `expiresAt`                                         |
| `remove-single-media-directly` / `remove-multiple-media-directly` | this service (`Cloudinary` class, as a retry path)              | Re-attempts a Cloudinary deletion that failed inline                              |

`media-service` only runs a worker for `media-service-queue`. `mail-service-queue` (used for OTP emails) is owned end-to-end by `user-service` (producer) and `mail-service` (worker) — unrelated to this service.

### Cross-service queue integration

Redis/BullMQ jobs are identified purely by queue name + job name at the Redis level, so any service can enqueue onto `media-service-queue` as long as it targets the same Redis instance and uses `@beautinique/backend-bullmq` — `product-service` does this in `publishDraftProductController` when it enqueues `mark-multiple-media-as-used`. This means:

- The `BULL_MQ_*` env vars must point to the **same** Redis instance across every service that touches `media-service-queue`.
- If `media-service-queue`'s schema/job names ever change in `backend-bullmq`, every producer needs a matching update, or those jobs will silently stop being picked up.

### Retry Behavior

- Every `jobProducer.addJob(...)` call from the controllers sets `attempts: 5, backoff: { type: 'exponential', delay: 5000 }`.
- `Cloudinary.removeSingle`/`removeMultiple` additionally track their **own** `retryCount` and re-queue via `remove-multiple-media-directly` on failure (up to `MAX_REMOVE_RETRIES = 5`), *on top of* BullMQ's own attempts/backoff on the job itself — a stuck deletion gets retried more aggressively than either mechanism alone, by design.

---

## 11. Cloudinary Integration (`classes/Cloudinary.ts`)

A singleton `Cloudinary` class wrapping the `cloudinary` SDK.

| Method                 | Description                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `uploadSingle(data)`   | Streams one file to Cloudinary (`upload_stream`), returns the optimized URL (`f_auto,q_auto` for images, `playback_url` for videos) |
| `uploadMultiple(data)` | Uploads all files in parallel; if any fails, rolls back every successful upload and throws                                          |
| `removeSingle(data)`   | Deletes one asset; on failure, re-queues via `remove-multiple-media-directly` (up to 5 retries) then rethrows                       |
| `removeMultiple(data)` | Deletes many assets in parallel (`p-limit`, concurrency 5); partial failures are re-queued for retry, never thrown                  |

**Folder naming:** `Beautinique/{Images|Videos}/{sanitized folder}` — unsafe characters (`&|/\#?%`) replaced with `_`, spaces collapsed, empty folder falls back to `common_folder`.

**Public ID format:** `{year}/{month}/{day}/{randomUUID}` — used both as the Cloudinary `public_id` and (prefixed with the folder path) to detect `image` vs `video` resource type from an existing URL (`getResourceTypeFromPublicId`).

**Resource type detection (for new uploads):** MIME type first, then file extension, defaulting to `image` if neither matches (`getResourceType`).

---

## 12. Utilities

### `utils/index.ts`

| Function                         | Description                                                                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateBaseMediaPayload(data)` | Builds the `Media` document payload from a Cloudinary `UploadApiResponse` + `userId` — extracts `url`, `publicId`, `resourceType`, `createdAt`, and `metadata` (`width`, `height`, `format`, `size`, `folder`) |

### External Utilities (from `@beautinique/*` packages)

| Function                | Package                         | Description                                                  |
| ----------------------- | ------------------------------- | ------------------------------------------------------------ |
| `getUser(user)`         | `@beautinique/backend-utils`    | Throws if `user` is null/undefined, otherwise returns it     |
| `getObjId(id)`          | `@beautinique/backend-mongoose` | Accepts string or `ObjectId`, returns a validated `ObjectId` |
| `stringifyData(data)`   | `@beautinique/shared-utils`     | Safe `JSON.stringify` wrapper used throughout logging        |
| `getConnectionHealth()` | `@beautinique/backend-mongoose` | Returns `{ readyState, connected, host, port, database }`    |

---

## 13. Error Handling

All errors are thrown as `AppError` subclasses from `@beautinique/backend-classes` (e.g. `AuthenticationError`, `AuthorizationError`, `ExternalServiceError`, `ValidationError`). Standard error codes used across the service:

| Code                     | HTTP Equivalent | When Used                                                 |
| ------------------------ | --------------- | --------------------------------------------------------- |
| `VALIDATION_ERROR`       | 400/422         | Failed Zod validation, empty request                      |
| `AUTHENTICATION_ERROR`   | 401             | Missing `X-User-Id`                                       |
| `AUTHORIZATION_ERROR`    | 403             | Missing/invalid `X-Service-Secret`, or role not permitted |
| `PAYLOAD_TOO_LARGE`      | 413             | File exceeds the allowed size for its type                |
| `SERVICE_UNAVAILABLE`    | 503             | MongoDB not connected (`checkDbConnection`)               |
| `EXTERNAL_SERVICE_ERROR` | 502             | Cloudinary upload/delete failure                          |
| `INTERNAL_SERVER_ERROR`  | 500             | Unexpected failures                                       |

Errors flow through the `errorResponse` middleware, which uses `envs.is_dev` to include/exclude the stack trace, and sends `{ success: false, code, message, fieldErrors?, globalErrors? }`.

---

## 14. Server Lifecycle

### Startup (`bootstrap/startup.ts`)

1. Register MongoDB event listeners (`registerDatabaseEvents`).
2. Connect MongoDB (`connectDb`).
3. Start the HTTP server (`startHttpServer`).
4. Start the `media-service-queue` worker (`workerManager.start()`).

Idempotent (`setStarted()` guards re-entry). On any failure, logs and calls `process.exit(1)`.

### Graceful Shutdown (`bootstrap/shutdown.ts`, `SIGINT`/`SIGTERM`)

1. Stop accepting new HTTP requests (`stopHttpServer`, existing requests finish first).
2. Stop the `media-service-queue` worker.
3. Close the BullMQ job producer.
4. Disconnect MongoDB.
5. Destroy any remaining open sockets.
6. Exit `0` on success, `1` on failure.

Idempotent (`setShuttingDown()` guards re-entry); every step's success/failure is logged individually via `Promise.all` + per-task `try/catch` (one task failing doesn't stop the others).

This service intentionally does **not** use `backend-bullmq`'s `registerGracefulShutdown` helper — it already owns this full, ordered sequence, and that helper registers its *own* `SIGTERM`/`SIGINT` listeners + calls `process.exit()` itself, which would race with the sequence above.

---

## 15. Build & Run Commands

```bash
npm install
npm run dev            # tsc --noEmit --watch + nodemon (tsx) — development, auto-restarts on src changes
npm run build           # tsc → dist/, then auto-regenerates public/index.html (see "postbuild" below)
npm run start            # node dist/index.js — production (run build first)
npm run start:dev        # build + start in one step
npm run lint              # eslint src
npm run lint:fix
npm run clean              # remove dist/
```

**`postbuild`** (`node scripts/generate-html.mjs`) runs automatically after every `npm run build`, via npm's `pre*`/`post*` script convention — it re-renders `README.md` → `public/index.html` using `@beautinique/shared-markdown-to-html`, so `GET /` is always in sync with the latest `README.md` after a build.

**Note:** this only fires on `npm run build` (and anything that calls it, like `start:dev`) — `npm run dev` runs `tsx` directly and never touches `tsc`/`postbuild`, so editing `README.md` during `npm run dev` won't update `GET /` until you run `npm run build` (or `node scripts/generate-html.mjs` directly).

### Deploying (Render / similar PaaS)

`typescript`, `@types/*`, and `@beautinique/backend-types`/`shared-types` are `devDependencies` (correct — they're build-time-only, never imported by compiled `dist/*.js`). Platforms that set `NODE_ENV=production` for their build step (Render does, by default) will skip installing `devDependencies`, which breaks `npm run build` (`tsc` needs them to type-check). Fix: set the platform's **Build Command** to explicitly include dev dependencies, e.g.:

```
npm install --include=dev && npm run build
```

This has no effect on the running process — `npm start` only ever touches `dist/*.js` and the real runtime `dependencies`.

### TypeScript strictness (`tsconfig.json`)

Beyond `strict: true`: `noUncheckedIndexedAccess` (indexed access is `T | undefined`, not `T`), `noEmitOnError` (a broken build produces no `dist/` output at all), `noUnusedLocals`/`noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. `declaration`/`declarationMap` are deliberately **off** — this is an application, not a package anything imports.

### ESLint (`eslint.config.mjs`)

Flat config: `@eslint/js` recommended → `typescript-eslint` recommended/strict/stylistic → type-checked variants (`recommendedTypeChecked`/`strictTypeChecked`/`stylisticTypeChecked` via `projectService`) → `simple-import-sort` → Prettier (last, disables conflicting stylistic rules). Notable custom rules: `no-floating-promises`/`no-misused-promises`/`require-await` (error), `no-explicit-any` (warn), `reportUnusedDisableDirectives` (error).

---

## 16. Shared Packages (`@beautinique/*`)

| Package                                | Purpose                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@beautinique/backend-bullmq`          | `JobProducer`/`JobWorker` — typed BullMQ wrapper, schema-checked jobs                                         |
| `@beautinique/backend-classes`         | `AppError` subclasses for structured error handling                                                           |
| `@beautinique/backend-logger`          | `createLogger`/`createHttpLogger` (Pino-based)                                                                |
| `@beautinique/backend-mongoose`        | `connectDb`, `checkDbConnection`, `getConnectionHealth`, `getObjId`, mongo events                             |
| `@beautinique/backend-multer`          | `validateMulter` — file type/size validated upload middleware                                                 |
| `@beautinique/backend-request`         | `checkServiceAccess`, `checkEmptyRequest`                                                                     |
| `@beautinique/backend-response`        | `successResponse`/`errorResponse`/`notFoundResponse`/`tryCatchResponse`                                       |
| `@beautinique/backend-utils`           | `getUser` and other backend-only helpers                                                                      |
| `@beautinique/backend-zod`             | `folderZodSchema`, `validateZod`                                                                              |
| `@beautinique/shared-constants`        | `MEDIA_STATUSES`, `MEDIA_RESOURCES`, `HEADERS_MAP`, `MAX_IMAGE_SIZE`, etc.                                    |
| `@beautinique/shared-markdown-to-html` | `generateHtmlFromMarkdown` — used by `scripts/generate-html.mjs` to render this README to `public/index.html` |
| `@beautinique/shared-utils`            | `stringifyData` and other cross-service helpers                                                               |
| `@beautinique/backend-types`           | `TFolderZodSchema` and other backend-only shared types                                                        |
| `@beautinique/shared-types`            | `TUserRole`, `TMediaResource`, etc.                                                                           |

---

## 17. API Response Format

All responses use `@beautinique/backend-response`'s envelope, attached via `app.use(successResponse({ defaultMessage: 'Success.' }))`:

```jsonc
// success
{ "success": true, "message": "File uploaded successfully", "data": "..." }

// error
{ "success": false, "code": "VALIDATION_ERROR", "message": "...", "fieldErrors": { ... }, "globalErrors": [ ... ] }
```

`res.success({ statusCode, message, data })` — `data` is omitted entirely (not sent as `null`) when not provided; `statusCode` defaults to `200`.

---

## 18. Design Notes / Known Trade-offs

- **TTL index is a backup, not the primary cleanup path.** The `expiresAt` TTL index (`expireAfterSeconds`) is set to `CLEANUP_DELAY` + a 1-day safety buffer (`TTL_SAFETY_BUFFER_SECONDS`), specifically so it fires well *after* the `delete-single-media`/`delete-multiple-media` BullMQ jobs (which are scheduled with exactly `CLEANUP_DELAY`, and also remove the actual Cloudinary asset). Without that buffer, Mongo's TTL monitor could delete the document before the BullMQ job runs, and the job would then find nothing to clean up — orphaning the Cloudinary asset forever, since the TTL sweep never touches Cloudinary itself.
- **Two overlapping retry mechanisms on Cloudinary deletion.** A failed removal is retried both by BullMQ's own `attempts`/`backoff` on the job *and* by the `Cloudinary` class's own `retryCount` re-queueing, after rethrowing. Not incorrect, but worth knowing if tuning retry/backoff behavior.
- **`relatedTo` on `Media` is currently unused.** The schema has a `relatedTo: { service, entity }` field, but nothing in this service (or the `product-service` integration) ever populates it.
- **`authorize` middleware is exported but unused.** No route currently requires role-based restriction beyond `authenticate`.
- **`GET /` regenerates on `npm run build`, not `npm run dev`.** `public/index.html` is generated from `README.md` by the `postbuild` script (`scripts/generate-html.mjs`). Editing this file while running `npm run dev` won't update `GET /` until a build actually runs.

---

## 19. Data Flow Example — Single Upload

```
Client → POST /api/v1/upload/single { file, folder } [X-Service-Secret, X-User-Id]
  → validateMulter + checkEmptyRequest + validateZod(folder)
  → cloudinary.uploadSingle(file, folder)          ← streams to Cloudinary
  → register afterRollback (removeSingle on failure)
  → jobProducer.addJob('create-single-unused-media', payload)
  → jobProducer.addJob('delete-single-media', { publicId }, { delay: 2 days })
  ← res.success({ statusCode: 201, data: url })

  (async, on the media-service-queue worker)
  → Media.create({ ...payload, status: 'UNUSED', expiresAt })

  (2 days later, unless marked USED first)
  → cloudinary.removeSingle(publicId)
  → Media.updateOne({ status: 'DELETED', deletedAt, expiresAt: +1 day })
```
