# Product Service — Documentation

**Project:** Beautinique (BQ-Microservices)
**Service:** Product Service
**Author:** Nageshwar Pawar
**Version:** 1.0.0
**Port:** configured via `PORT` (see [§4](#4-environment-variables))

---

## 1. Overview

The Product Service owns the product catalog and category tree for the **Beautinique** platform: a multi-step draft → review → publish flow for seller-submitted products, category CRUD with a 3-level hierarchy (L1/L2/L3), a searchable/paginated seller & admin dashboard, public product lookup, Atlas Search-powered autocomplete suggestions, and a Redis-backed cache for categories and dashboard products. It also serves its own documentation: `GET /` renders this README as HTML, and `GET /docs` serves an interactive Swagger UI.

---

## 2. Technology Stack

| Layer                     | Technology                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Runtime                    | Node.js (ES2025, ESM)                                                                       |
| Language                   | TypeScript 6.x (`strict`, `noUncheckedIndexedAccess`, `noEmitOnError`)                      |
| Framework                  | Express.js 5.x                                                                              |
| Database                   | MongoDB (via Mongoose 9.x, `@beautinique/backend-mongoose`), plus MongoDB Atlas Search (`$search`) for product/dashboard search |
| Cache                      | Redis, via the `redis` client (custom `RedisCacheManager`, not a shared package)             |
| Background jobs / queue    | BullMQ (Redis), via `@beautinique/backend-bullmq` — **producer only**, `media-queue` (see [§16](#16-background-jobs-media-queue-producer-only)) |
| Validation                 | Zod, via `@beautinique/backend-zod`                                                          |
| Logging                    | Pino, via `@beautinique/backend-logger`                                                      |
| API docs                   | OpenAPI 3.0 spec (hand-written) + `swagger-ui-express`                                       |
| README rendering           | `@beautinique/shared-markdown-to-html` (markdown → HTML)                                     |
| Shared response envelope   | `@beautinique/backend-response`                                                              |
| Shared utilities           | `@beautinique/backend-utils`, `@beautinique/backend-mongoose`, `@beautinique/shared-utils`  |
| Shared constants/types     | `@beautinique/shared-constants`, `@beautinique/backend-types`                                |
| Slug generation            | `slugify`                                                                                     |
| Code quality                | ESLint (flat config, type-checked + strict), Prettier                                        |

---

## 3. Project Structure

```
product-service/
├── src/
│   ├── index.ts                       # Entry point: loads env, wires SIGINT/SIGTERM, calls startup()
│   ├── app.ts                         # Express app: middleware chain, routes, error handlers
│   ├── bootstrap/                     # Startup/shutdown orchestration
│   │   ├── startup.ts                 #   Mongo+Redis (parallel) → HTTP server, in order
│   │   ├── shutdown.ts                #   HTTP server → job producer/Redis/Mongo (parallel) → sockets, in order
│   │   ├── server.ts                  #   Low-level HTTP server lifecycle + connection tracking
│   │   └── database-events.ts         #   Mongo connection event → logger wiring
│   ├── classes/
│   │   ├── index.ts                   #   Re-exports
│   │   └── redis/
│   │       ├── index.ts               #   RedisCacheManager - owns the client, connect()/close(), .category/.dashboard
│   │       ├── RedisCacheHelper.ts    #   Base class: string/hash get/set/delete primitives
│   │       ├── RedisCacheCategory.ts  #   Category tree cache (cache-aside over MongoDB, 1-day self-healing TTL)
│   │       └── RedisCacheDashboard.ts #   Draft-product + published-product-by-slug cache (1-day TTL)
│   ├── configs/
│   │   └── index.ts                   #   Singletons: databaseConfigs, logger, jobProducer, redisClient, redisCacheManager
│   ├── constants/
│   │   └── index.ts                   #   LOGGER_BASE_OPTIONS, route paths (METHODS_AND_PATHS), PRODUCT_DASHBOARD_PROJECTION
│   ├── controllers/
│   │   ├── index.ts                   #   Re-exports all controllers
│   │   ├── category/
│   │   │   ├── addCategory.ts         #   Create a category (L1/L2/L3)
│   │   │   ├── updateCategory.ts      #   Update a category (name/parent/description)
│   │   │   ├── deleteCategory.ts      #   Delete a leaf category with no products
│   │   │   └── getCategory.ts         #   List by parent+level / full hierarchy tree
│   │   └── product/
│   │       ├── saveDraftProduct.controller.ts        #   Save one step of a multi-step draft (Redis hash)
│   │       ├── publishDraftProduct.controller.ts     #   Turn a complete draft into a real Product document
│   │       ├── publishPendingProduct.controller.ts   #   Approve a PENDING product → PUBLISHED (not yet routed, see §24)
│   │       ├── getDraftProduct.controller.ts          #   Fetch the caller's in-progress draft
│   │       ├── getDashboardProducts.controller.ts     #   Paginated/sortable/searchable seller+admin listing
│   │       ├── getDashboardProductBySlug.controller.ts #  Single product lookup for the dashboard (cache-aside)
│   │       ├── getProductBySlugController (getProductBySlug.controller.ts) # Public storefront product lookup
│   │       └── getProductsSuggestions.controller.ts   #   Atlas Search autocomplete suggestions
│   ├── docs/
│   │   └── openapi.ts                 #   Hand-written OpenAPI 3.0 spec, served at /docs
│   ├── envs/
│   │   └── index.ts                   #   process.env → typed envs, fail-fast on missing/invalid vars
│   ├── middlewares/
│   │   ├── auth.middleware.ts                        #   authenticate, authorize
│   │   └── createPendingProductPayload.middleware.ts  #   Loads the caller's Redis draft into req.body before publish
│   ├── models/
│   │   └── index.ts                   #   Category, Product (Mongoose)
│   ├── routes/
│   │   ├── index.ts                   #   Root router (/api/v1)
│   │   ├── category.routes.ts         #   Category CRUD + listing routes
│   │   └── product.routes.ts          #   Draft, dashboard, public product routes
│   ├── schemas/                       # Mongoose schema definitions
│   │   ├── index.ts
│   │   ├── category.schema.ts
│   │   └── product.schema.ts          #   Also defines variantSchema, historySchema, tryOnSchema
│   ├── services/
│   │   └── index.ts                   #   findOrCreateCategory (upsert helper)
│   ├── types/
│   │   ├── index.ts                   #   Core interfaces (ICategory, TProduct, TDashboardListProduct, etc.)
│   │   └── express.d.ts               #   Request.user augmentation
│   └── utils/
│       └── index.ts                   #   Slug/SKU generation, minimal-category projector, Atlas Search pipelines
├── scripts/
│   └── generate-html.mjs              # Renders README.md → public/index.html, runs via "postbuild"
├── public/
│   └── index.html                     # Pre-rendered README, served by GET /
├── dist/                              # Compiled JavaScript output (git-ignored)
├── logs/                              # Pino log output
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── .env
```

---

## 4. Environment Variables

All environment variables are loaded via `dotenv` and validated in `src/envs/index.ts` — every required variable is checked with `requireEnv`/`requirePort` at startup, so a missing or invalid value throws a clear error immediately instead of failing confusingly later.

### 4.1 Server & App

| Variable         | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| `PORT`            | HTTP port to listen on                                                               |
| `IS_DEV`          | `"true"` enables pretty logging and stack traces in error responses                  |
| `SERVICE_NAME`    | Name tag attached to every log line                                                  |
| `SERVICE_SECRET`  | Shared secret required in the `X-Service-Secret` header on every `/api/v1/*` request |
| `DATABASE_NAME`   | MongoDB database name                                                                |

### 4.2 MongoDB

| Variable       | Description               |
| --------------- | -------------------------- |
| `MONGODB_URI`   | MongoDB connection string |

### 4.3 Redis — Cache

| Variable          | Description                                    |
| ------------------ | ----------------------------------------------- |
| `CACHE_HOST`       | Redis host used for the category/dashboard cache |
| `CACHE_PORT`       | Redis port                                      |
| `CACHE_PASSWORD`   | Redis password                                  |
| `CACHE_USERNAME`   | Redis username                                  |

### 4.4 Redis — BullMQ

| Variable            | Description                                             |
| -------------------- | --------------------------------------------------------- |
| `BULL_MQ_HOST`       | Redis host used for the `media-queue` BullMQ connection    |
| `BULL_MQ_PORT`       | Redis port                                                |
| `BULL_MQ_PASSWORD`   | Redis password                                            |
| `BULL_MQ_USERNAME`   | Redis username                                            |

**This Redis instance is shared** with `media-service`, which runs the `media-queue` worker — it must point to the same instance in both services.

---

## 5. Database Models

### 5.1 Category Schema (`category.schema.ts`)

Collection: `categories`

| Field           | Type                | Required | Default   | Notes                                                        |
| ----------------- | --------------------- | ---------- | ----------- | ---------------------------------------------------------------- |
| `name`           | String               | Yes       | —          | Trimmed, 2–120 chars                                            |
| `slug`           | String               | Yes       | —          | Lowercased, auto-derived from `name` on every `validate` (non-unique slug — uniqueness is enforced by the compound `{parent,slug}` index, not the slug alone) |
| `description`    | String               | No        | —          | 10–150 chars; only meaningful for L3 (cleared for L1/L2, see below) |
| `level`          | Number (enum)        | Yes       | —          | `1` (main), `2` (sub), `3` (final/product-facing) — `CATEGORY_LEVELS_MAP` |
| `parent`         | ObjectId ref `Category` | No     | —          | Cleared for L1 (root categories have no parent)                  |
| `isLeaf`         | Boolean              | No        | `true`     | Flipped to `false` when a category gains its first child, back to `true` when its last child is removed/reparented |
| `productCount`   | Number               | No        | —          | Maintained mainly for L3 (product-facing) categories             |
| `createdBy`      | ObjectId             | Yes       | —          | Caller's user id                                                  |
| `updatedBy`      | ObjectId             | No        | —          | Caller's user id on update                                        |

Also has `timestamps: true`, `versionKey: false`, and a case-insensitive `collation: { locale: 'en', strength: 1 }` for Atlas Search friendliness.

**Pre-validate hook:** auto-derives `slug` from `name`; for `level: L1` clears both `parent` and `description`; for `level: L2` clears `description`.

**Indexes:**
- `{ parent: 1, slug: 1 }` unique — a category's slug only has to be unique among its siblings, not globally
- `{ name: 'text', slug: 'text', description: 'text' }`
- `{ createdBy: 1, level: 1 }`, `{ parent: 1, level: 1 }`, `{ isLeaf: 1, level: 1 }`
- Single-field indexes on `name`, `slug`, `description`, `level`, `parent`, `isLeaf`, `productCount`, `createdBy`, `updatedBy`

### 5.2 Product Schema (`product.schema.ts`)

Collection: `products`

| Field                | Type                        | Required | Default        | Notes                                                     |
| ----------------------- | ----------------------------- | ---------- | ---------------- | --------------------------------------------------------------- |
| `title`                | String                       | Yes       | —              | 2–200 chars                                                    |
| `sku`                  | String                       | Yes       | —              | Uppercased, globally unique (own index, not just `unique: true` on the path) |
| `brand`                | String                       | Yes       | —              | 2–100 chars                                                    |
| `originalPrice` / `sellingPrice` | Number             | Yes       | —              | `sellingPrice` cannot exceed `originalPrice`; `originalPrice` must be > 0 |
| `discount`             | Number                       | No        | `0`             | Auto-calculated from the two prices on every `validate`         |
| `stock` / `stockThreshold` | Number                  | No        | `null`          | Only meaningful when `hasVariants: false`                       |
| `shortDescription`     | String                       | Yes       | —              | 10–300 chars                                                    |
| `description`          | String                       | Yes       | —              | ≥107 chars                                                       |
| `instructions` / `ingredients` / `additional` | String       | No        | —              | ≥20 chars each, when present                                     |
| `slug`                 | String                       | Yes       | —              | Globally unique                                                  |
| `images` / `thumbnail` | [String] / String            | Yes       | —              | Cloudinary URLs                                                   |
| `video`                | String                       | No        | —              | Cloudinary URL                                                    |
| `category`             | ObjectId ref `Category`      | Yes       | —              | Always the deepest (L3) category                                 |
| `seller`               | ObjectId                     | Yes       | —              | Owning seller's user id                                           |
| `soldCount` / `returnCount` / `totalReviews` / `totalRating` | Number  | No | `0`     | —                                                                |
| `averageRating`        | Number                       | No        | `0`             | 0–5                                                              |
| `reviews`               | [ObjectId ref `Review`]      | No        | `[]`            | External, owned by another service                               |
| `hasVariants`           | Boolean                      | Yes       | —              | Gates whether `stock`/`stockThreshold` or `variants` is meaningful |
| `variants`             | [variantSchema]              | No        | `[]`            | Required (non-empty, unique SKUs) when `hasVariants: true`        |
| `status`               | String (enum)                | No        | `"PENDING"`     | `DELETED`, `PENDING`, `PUBLISHED`, `REJECTED`, `BLOCKED` (`PRODUCT_STATUSES_MAP`) |
| `history`              | historySchema                | No        | —              | `approvedBy`/`approvedAt`, `blockedBy`/`blockedAt`, `rejectedBy`/`rejectedAt`/`rejectReason` |
| `tryOn`                | tryOnSchema                  | No        | —              | Virtual try-on configuration, see below                          |

Also has `timestamps: true`, `versionKey: false`.

**`variantSchema`** (subdocument): `sku`, `type` (`Color`/`Text`), `label`, `value`, `originalPrice`, `sellingPrice`, `discount` (auto-calculated), `stock`, `stockThreshold`, `images`, `thumbnail`. Its own `pre('validate')` enforces `originalPrice > 0` and `sellingPrice <= originalPrice` per variant.

**`tryOnSchema`** (subdocument): `configured` (bool), `enabled` (bool), `category` (enum `TRY_ON_CATEGORIES`, required when `configured`), `subCategory` (enum `TRY_ON_ALL_SUB_CATEGORIES`, required when `configured` + `category` set, validated against `TRY_ON_MAP[category]`). Its own `pre('validate')` re-checks the same category/sub-category relationship — this is the **only** place that validation runs; `productSchema`'s own hook only computes `discount` and does not duplicate it (Mongoose runs a subdocument's own validators automatically as part of validating the parent).

**Indexes:** text search (`title`, `brand`, `shortDescription`), unique `sku`, `{category,status}`, `{seller,status,createdAt}`, `sellingPrice`, `soldCount`, `averageRating`, `{status,createdAt}`, `tryOn.configured`, `hasVariants`, and three category+status compound indexes for price/rating/sales-sorted category listings.

*Note: there is no `Review` model in this service — `reviews` is an array of external references only.*

---

## 6. API Routes

All `/api/v1/*` routes require the `X-Service-Secret` header and a ready MongoDB connection (`checkServiceAccess` + `checkDbConnection`, both mounted in `app.ts`, scoped to `/api/v1`). `/`, `/docs`, and `/health` are intentionally outside that and reachable without either.

### 6.1 Home, Docs & Health

| Method | Path        | Auth | Description                                                      |
| -------- | ------------- | ------ | -------------------------------------------------------------------- |
| GET     | `/`          | None  | This README, pre-rendered to HTML by `scripts/generate-html.mjs` |
| GET     | `/docs`      | None  | Interactive Swagger UI (spec in `src/docs/openapi.ts`)             |
| GET     | `/health`    | None  | Liveness + MongoDB connection status                              |

### 6.2 Category — `/api/v1/category`

| Method | Path                     | Auth                  | Description                                                    |
| -------- | --------------------------- | ------------------------ | -------------------------------------------------------------------- |
| POST    | `/category`                | ADMIN, MASTER          | Create a category (L1/L2/L3, with parent/level rules)                |
| PATCH   | `/category/:categoryId`    | ADMIN, MASTER          | Update a category (name/parent/description; level is immutable)      |
| DELETE  | `/category/:categoryId`    | ADMIN, MASTER          | Delete a leaf category with zero products                            |
| GET     | `/category/by-parent-level`| ADMIN, MASTER, SELLER  | List categories filtered by `level` + `parent` (cache-aside)         |
| GET     | `/category/by-hierarchy`   | None                   | Full L1→L2→L3 nested tree (cache-aside)                              |

### 6.3 Product — `/api/v1/product`

| Method | Path                              | Auth                  | Description                                                    |
| -------- | ------------------------------------ | ------------------------ | -------------------------------------------------------------------- |
| POST    | `/product/draft`                   | ADMIN, SELLER, MASTER  | Save one step of a multi-step draft into the Redis draft hash         |
| GET     | `/product/draft`                   | ADMIN, SELLER, MASTER  | Fetch the caller's current in-progress draft                          |
| PATCH   | `/product/draft/publish`           | ADMIN, SELLER, MASTER  | Turn a **complete** draft into a real `Product` document (`PENDING` for sellers, `PUBLISHED` directly for admins) |
| GET     | `/product/dashboard/products`      | ADMIN, SELLER, MASTER  | Paginated/sortable/Atlas-Search listing, scoped to own products for sellers |
| GET     | `/product/dashboard/:slug`         | ADMIN, SELLER, MASTER  | Single product lookup for the dashboard (cache-aside, 1-day TTL)      |
| GET     | `/product/:slug`                   | None                   | Public storefront lookup — only `PUBLISHED` products                 |
| GET     | `/product/suggestions`             | None                   | Atlas Search autocomplete (title/brand/slug/shortDescription)          |

**Declared but not currently wired to a route** (present in `METHODS_AND_PATHS`, `src/constants/index.ts`, but with no matching route registration in `product.routes.ts`) — see [§24](#24-design-notes--known-trade-offs):

| Method | Path                    | Intended purpose (from the constant's own comment)              |
| -------- | -------------------------- | ---------------------------------------------------------------------- |
| DELETE  | `/product/draft`          | Discard the caller's in-progress draft                                  |
| PATCH   | `/product/draft`          | Edit an already-published product's draft-style fields                 |
| PATCH   | `/product/publish`        | Approve a `PENDING` product → `PUBLISHED` (controller exists: `publishPendingProductController`, just not routed) |
| GET     | `/product/products`       | A public product listing, distinct from the dashboard one              |

### 6.4 Draft Product Steps

`POST /product/draft` accepts one step at a time, keyed by `step` in the body, and accumulates into a single Redis hash per user:

| Step | Field key               | Contents                                              |
| ------ | -------------------------- | ---------------------------------------------------------- |
| —     | `basicInfo`                | title, brand, prices, L1/L2/L3 category                    |
| 1     | `mediaAndGallery`          | thumbnail, images, video                                    |
| —     | `descriptionAndContent`    | shortDescription, description, instructions, ingredients, additional |
| 3     | `stockAndVariants`         | hasVariants + either stock/stockThreshold or a variants array |
| —     | `tryOnConfiguration`       | enabled + optional category/subCategory                     |

---

## 7. Request Headers

| Header               | Purpose                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `X-Service-Secret`     | Service-to-service authentication (`checkServiceAccess`, required on `/api/v1/*`) |
| `X-User-Id`             | End user's id (forwarded by the gateway/caller, required wherever a role is listed under "Auth" above) |
| `X-User-Role`           | End user's role, defaults to `USER` if not sent                    |

There's no JWT here — the gateway/upstream service is expected to have already authenticated the user and forwarded their identity via `X-User-Id`/`X-User-Role`.

---

## 8. Category Management

### 8.1 Create (`POST /category`)

1. If `parent` is given, it must exist and be exactly one level shallower than the new category's `level` (L2 needs an L1 parent, L3 needs an L2 parent).
2. Duplicate check: no sibling (same `parent`) may already have the same slug.
3. On save, a MongoDB duplicate-key error (E11000, from a concurrent create racing the same slug) is caught and converted to a friendly `ConflictError` rather than a raw 500.
4. If a `parent` was set, that parent's `isLeaf` flips to `false`.
5. The Redis category cache is updated **after the transaction commits** (`res.locals.afterCommit`), so a rollback never leaves a phantom category cached.

### 8.2 Update (`PATCH /category/:categoryId`)

1. `level` is immutable — attempting to change it throws `ConflictError`.
2. `parent` is only touched if the key is present in the request body at all (`'parent' in restBody`) — omitting it entirely leaves the existing parent untouched; sending it re-validates and re-parents (self-parent and level checks, same as create).
3. If `name` changes, the slug is regenerated and re-checked for duplicates among the (possibly new) siblings.
4. After the update, the **old** parent's `isLeaf` is recalculated (back to `true` if it has no children left) and the **new** parent's `isLeaf` is forced to `false` — only when the parent actually changed.
5. Redis cache update is deferred to `res.locals.afterCommit`, same as create.

### 8.3 Delete (`DELETE /category/:categoryId`)

1. Only a **leaf** category (`isLeaf: true`) can be deleted — `UnprocessableEntityError` otherwise.
2. An L3 category with `productCount > 0` cannot be deleted.
3. If the deleted category was its parent's only child, the parent's `isLeaf` flips back to `true`.
4. Redis cache delete is deferred to `res.locals.afterCommit` — if the Redis delete itself ever fails, it's caught and logged (`RedisCacheHelper` swallows Redis-level errors), and the categories hash's 1-day TTL (see [§10](#10-redis-cache-classesredis)) bounds how long a stale entry can survive before a full reseed from MongoDB self-heals it.

### 8.4 Listing

- `GET /category/by-parent-level?level=&parent=` — filters the cached category list in memory; omitting `level` returns everything, L1 ignores `parent`.
- `GET /category/by-hierarchy` — builds the full L1→L2→L3 tree in memory from the same cached flat list (parent-keyed map + recursive builder).

Both read exclusively from `RedisCacheCategory.getAllCategories()` (cache-aside, seeds itself from MongoDB on a cold/expired cache) — neither queries MongoDB directly.

---

## 9. Product Flow

### 9.1 Draft → Publish

1. `POST /product/draft` is called once per step (see [§6.4](#64-draft-product-steps)), each call writing one field into a per-user Redis hash (`bq:products:draft:<userId>`), TTL fixed at 24h from the **first** step (not renewed on subsequent steps).
2. `GET /product/draft` returns whatever has been saved so far.
3. `PATCH /product/draft/publish`:
   - `createPendingProductPayload` middleware loads the full draft from Redis into `req.body`, throwing `NotFoundError('Draft expired')` if nothing is cached (TTL elapsed or never started).
   - Body is validated against `draftProductDetailsZodSchema` — every step must be present and complete.
   - The controller builds a full `Product` payload from the draft (SKU generation, slug generation, image extraction for later cleanup, variant SKU generation), sets `status: PENDING` for sellers or `PUBLISHED` (+ `history.approvedAt/approvedBy`) for admins/masters.
   - `product.validate()` is called explicitly before `save()` so Mongoose validation errors surface before any DB write is attempted.
   - After commit: any image public IDs referenced by the product are marked "used" via a `media-queue` job (see [§16](#16-background-jobs-media-queue-producer-only)), and the Redis draft is deleted.

### 9.2 Pending Approval (`publishPendingProductController`)

Approves a `PENDING` product (created by a non-admin seller) into `PUBLISHED`, stamping `history.approvedBy`/`history.approvedAt`. **Not currently wired to a route** — see [§24](#24-design-notes--known-trade-offs).

### 9.3 Dashboard Listing (`GET /product/dashboard/products`)

- Sellers only ever see their own products (`seller` scoped from `X-User-Id`); admins/masters see everything, optionally filtered by `status`/`category`.
- With a non-empty `search` query, uses an Atlas Search (`$search`) pipeline (autocomplete on `title`, fuzzy-matched) with a `$facet` for paginated results + total count in one round trip; without a search term, falls back to a plain `Product.find()` + `countDocuments()`.
- Either path also runs a separate `$group`-by-`status` aggregation (scoped by seller/category, **not** by status) to populate a status-count summary (`{ ALL, PENDING, PUBLISHED, ... }`) alongside the page of results.
- Only projects `PRODUCT_DASHBOARD_PROJECTION` (`src/constants/index.ts`) — notably, `variants` is projected as `variants.stock` only (not the full variant subdocuments), which `TDashboardListProduct['variants']` is typed to match.

### 9.4 Public Lookup & Suggestions

- `GET /product/:slug` — only ever returns `PUBLISHED` products, populates `category.name`, queries MongoDB directly (no cache layer).
- `GET /product/dashboard/:slug` — cache-aside over Redis (1-day TTL, deferred cache population via `res.locals.afterFinish` so the cache write never delays the response), excludes `variants.stockThreshold`.
- `GET /product/suggestions?search=` — Atlas Search autocomplete/fuzzy pipeline across `title` (must-match), `brand`/`slug`/`shortDescription` (should-match, weighted), limited to 5 `PUBLISHED` results.

---

## 10. Redis Cache (`classes/redis/`)

A `RedisCacheManager` singleton (instantiated once in `configs/index.ts`, exported as `redisCacheManager`) wraps a single `redis` client and exposes two sub-caches, `.category` (`RedisCacheCategory`) and `.dashboard` (`RedisCacheDashboard`), both extending the shared `RedisCacheHelper` base class.

### Key Prefixes

| Prefix                                  | Purpose                        |
| ------------------------------------------ | ------------------------------------- |
| `bq:products:categories`                   | Single hash holding every category, keyed by category id |
| `bq:products:draft:<userId>`               | One user's in-progress draft product   |
| `bq:products:dashboard:product:<slug>`     | A single dashboard product lookup       |

### `RedisCacheCategory` (`classes/redis/RedisCacheCategory.ts`)

| Method                     | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `getAllCategories()`          | Cache-aside: reads the whole hash; on empty, reseeds from MongoDB               |
| `setCategory(category)`       | Writes/overwrites one category field; sets the hash's TTL (1 day) only if the hash didn't already exist, so an active hash's expiry never keeps getting pushed out by routine writes |
| `deleteCategory(categoryId)`  | Removes one category field from the hash                                        |

The 1-day TTL means any missed/failed invalidation (e.g. a Redis delete that silently fails) self-heals within at most a day, since a fully-expired hash forces `getAllCategories()` back to MongoDB.

### `RedisCacheDashboard` (`classes/redis/RedisCacheDashboard.ts`)

| Method                          | Description                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `getDraftProduct(userId)`           | Read the caller's in-progress draft                                              |
| `saveDraftProductStep(userId, body)`| Write one step's field into the draft hash (24h TTL, fixed from first write)     |
| `deleteDraftProduct(userId)`        | Remove the draft entirely (called after a successful publish)                    |
| `hasDraftProduct(userId)`           | Existence check                                                                   |
| `getProductBySlug(slug)`            | Cache-aside dashboard product lookup                                             |
| `setProductBySlug(slug, product)`   | Cache a dashboard product (24h TTL)                                              |
| `deleteProductBySlug(slug)`         | Invalidate a cached dashboard product                                            |
| `hasProductBySlug(slug)`            | Existence check                                                                   |

### `RedisCacheHelper` (`classes/redis/RedisCacheHelper.ts`)

Shared low-level primitives both sub-caches build on: `setData`/`getData`/`deleteData` (string), `setHashData`/`getHashField`/`getAllHashFields`/`deleteHashField`/`deleteHashData` (hash), `exists`/`hasHashField`. Every method resolves to a safe default (`null`, `false`, `{}`, or simply returns) and logs a warning instead of throwing on a Redis-level failure — a Redis outage degrades the service, it doesn't crash it.

### Redis Fallback Behavior

`RedisCacheManager` passes each sub-cache a `getClient()` closure that returns `null` whenever `isReady` is false (client not connected / mid-reconnect). `RedisCacheHelper`'s methods check this before every operation, so a Redis outage falls through to MongoDB wherever a cache-aside read exists, without any special-cased logic in the sub-caches themselves.

### Reconnection Strategy (`configs/index.ts`)

The `redisClient` (used by `RedisCacheManager`) is configured with a `reconnectStrategy`: exponential-ish backoff of `min(retries * 1000ms, 10s)`, giving up after 5 retries.

### Transactional Writes: `res.locals.afterCommit`

Every mutating category controller (`addCategoryController`, `updateCategoryController`, `deleteCategoryController`) runs inside a Mongoose transaction (`tryCatchSession`) and defers its Redis write/delete to `res.locals.afterCommit`, which `@beautinique/backend-mongoose` only runs **after** the transaction has actually committed. This avoids the cache ever getting ahead of the database — if the transaction rolls back, the queued Redis task simply never runs.

---

## 11. Middlewares

### `authenticate` (`middlewares/auth.middleware.ts`)

Reads `X-User-Id` (throws `AuthenticationError` if missing) and `X-User-Role` (defaults to `USER`), attaches `{ _id, role }` to `req.user`. Exported but not currently mounted on any route directly — `authorize` (below) is used everywhere instead, since every mutating/dashboard route also needs a role check.

### `authorize(allowedRoles)` (`middlewares/auth.middleware.ts`)

Factory middleware — same header extraction as `authenticate`, plus throws `AuthorizationError` if `X-User-Role` isn't in `allowedRoles`. Mounted on every category-management route and both the `/product/draft/*` and `/product/dashboard/*` route groups.

### `createPendingProductPayload` (`middlewares/createPendingProductPayload.middleware.ts`)

Loads the caller's Redis draft (`redisCacheManager.dashboard.getDraftProduct`) and overwrites `req.body` with it before `PATCH /product/draft/publish` reaches Zod validation — throws `NotFoundError('Draft expired')` if nothing is cached.

### External Middlewares (from `@beautinique/*` packages)

| Middleware              | Package                             | Purpose                                                                    |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| `checkServiceAccess`      | `@beautinique/backend-request`         | Validates `X-Service-Secret`, timing-safe compare                              |
| `checkDbConnection`       | `@beautinique/backend-mongoose`        | Rejects with 503 if MongoDB isn't ready (scoped to `/api/v1` only)             |
| `checkEmptyRequest`       | `@beautinique/backend-request`         | Guards against empty request bodies/params before validation                    |
| `validateZod`             | `@beautinique/backend-zod`             | Request body validation via Zod (`categoryZodSchema`, `draftProductStepBodyZodSchema`, etc.) |
| `tryCatchResponse`        | `@beautinique/backend-response`        | Wraps non-transactional controllers in try/catch, forwards errors to `errorResponse` |
| `tryCatchSession`         | `@beautinique/backend-mongoose`        | Wraps transactional controllers in a Mongoose session + `res.locals.afterCommit`/`afterRollback`/`afterResponse`/`afterFinish` hooks |
| `successResponse`         | `@beautinique/backend-response`        | Attaches `res.success({ statusCode, message, data })`                          |
| `notFoundResponse`        | `@beautinique/backend-response`        | 404 handler (branded HTML page for browser requests)                            |
| `errorResponse`           | `@beautinique/backend-response`        | Central error handler                                                            |
| `createHttpLogger`        | `@beautinique/backend-logger`          | Per-request Pino logging                                                          |

---

## 12. Services Layer (`services/index.ts`)

| Function                                   | Description                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `findOrCreateCategory({name,slug,parent,level,session})` | Upsert helper (`findOneAndUpdate` + `$setOnInsert`, `upsert: true`) — not currently called from any controller in this service; available for cross-service or seed use |

---

## 13. Utilities (`utils/index.ts`)

| Function                                  | Description                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `generateSlug(text, unique = true)`            | `slugify` + optional `-<timestamp>` suffix for global uniqueness (products); categories call it with `unique: false` since sibling-scoped uniqueness comes from the compound index |
| `getMinimalCategory(category)`                 | Client/cache-facing category shape — `_id` as string; `parent`/`description` only for L2/L3 as applicable |
| `generateSku({data, prefix, unique})`          | Builds an uppercase SKU from the first 3 alphanumeric chars of each `data` value, joined with `-`, plus an optional prefix and a random 6-digit suffix |
| `getCloudinaryPublicIdFromUrl(url)`            | Extracts a Cloudinary public id from a delivery URL (throws `UnprocessableEntityError` if it doesn't look like one) |
| `extractImageUrlsFromHtml(html)`               | Regex-extracts every `<img src="...">` from a rich-text field (used to find images to mark "used" in `media-queue`) |
| `getProductSuggestionsPipeline(query)`         | Builds the Atlas `$search` aggregation pipeline for `/product/suggestions`             |
| `getInitialProductCountsByStatus()`            | Zero-filled `{ ALL, DELETED, PENDING, PUBLISHED, REJECTED, BLOCKED }` counter object    |
| `populateProductCountsByStatus(counts, rows)`  | Folds a `$group`-by-status aggregation result into the counter object above             |

---

## 14. Error Handling

All errors are thrown as `AppError` subclasses from `@beautinique/backend-classes` (e.g. `NotFoundError`, `ValidationError`, `ConflictError`, `UnprocessableEntityError`). Standard error codes used across the service:

| Code                     | HTTP Equivalent | When Used                                                          |
| --------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `NOT_FOUND`                | 404                | Category/parent/product not found; expired draft; parent category missing |
| `CONFLICT`                 | 409                | Duplicate sibling category slug; category cannot be its own parent; category `level` change attempted |
| `UNPROCESSABLE_ENTITY`     | 422                | Deleting a non-leaf category or an L3 category with products; invalid parent level; invalid prices; invalid try-on category/sub-category; malformed Cloudinary URL |
| `AUTHENTICATION_ERROR`     | 401                | Missing `X-User-Id`                                                     |
| `AUTHORIZATION_ERROR`      | 403                | Caller's role isn't in the route's `allowedRoles`                       |
| `INTERNAL_SERVER_ERROR`    | 500                | Unexpected failures; `findOrCreateCategory` upsert failure               |

Errors flow through the `errorResponse` middleware (`@beautinique/backend-response`), which only forwards `message`/`code`/`statusCode`/`fieldErrors`/`globalErrors` for **operational** `AppError`s — anything else is converted to a generic `InternalServerError` before the client ever sees it, and `envs.is_dev` controls whether a stack trace is attached.

---

## 15. Server Lifecycle

### Startup (`bootstrap/startup.ts`)

1. Register MongoDB event listeners (`registerDatabaseEvents`).
2. Connect MongoDB and Redis **in parallel** (`Promise.all([connectDb(...), redisCacheManager.connect()])`) — safe because `redisCacheManager.connect()` never rejects (it swallows its own errors internally); a Mongo failure still aborts startup via the outer `catch`.
3. Start the HTTP server (`startHttpServer`) — only after both connection attempts above have settled, so the service never opens its port while a dependency is still connecting.

Idempotent (`setStarted()` guards re-entry). On any failure, logs and calls `process.exit(1)`.

### Graceful Shutdown (`bootstrap/shutdown.ts`, `SIGINT`/`SIGTERM`)

1. Stop accepting new HTTP requests (`stopHttpServer`, existing requests finish first).
2. Close the job producer, the Redis cache, and disconnect MongoDB — **in parallel** (`Promise.all` over per-task `try/catch`, so one failing doesn't block the others).
3. Destroy any remaining open sockets.
4. Exit `0` on success, `1` on failure.

Idempotent (`setShuttingDown()` guards re-entry). Only the job-producer shutdown task is named for per-step success/failure logging today — the Redis/Mongo tasks in the same list run and are awaited, but aren't individually logged by name.

---

## 16. Background Jobs (`media-queue`, producer only)

This service **only produces** onto `media-queue` — it doesn't run a worker for anything. `jobProducer` (`@beautinique/backend-bullmq`'s `JobProducer`, configured in `configs/index.ts`) is used from `publishDraftProductController`.

| Job name                       | Enqueued from                     | Consumed by       |
| ---------------------------------- | ------------------------------------ | ----------------------- |
| `mark-multiple-media-as-used`      | `publishDraftProductController` (`afterCommit`) | `media-service` |

Every image/thumbnail/video URL referenced by a newly-published product (including images embedded in the rich-text `description`/`ingredients`/`instructions`/`additional` fields) is resolved to a Cloudinary public id and enqueued for the media service to mark as in-use, so orphan-cleanup jobs elsewhere don't delete assets that a product is actively using.

**Retry/backoff:** configured per-call for this job specifically (`attempts: 5, backoff: { type: 'exponential', delay: 5000 }`), on top of the `jobProducer`'s own defaults (`attempts: 3`, `backoff: { type: 'exponential', delay: 2000 }`, `removeOnComplete: { age: 30, count: 5 }`, `removeOnFail: { age: 1800, count: 10 }`).

The `BULL_MQ_*` env vars must point to the **same** Redis instance as `media-service`'s BullMQ connection, or enqueued jobs will never be picked up.

---

## 17. Build & Run Commands

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

**`postbuild`** (`node scripts/generate-html.mjs`) runs automatically after every `npm run build` — it re-renders `README.md` → `public/index.html` using `@beautinique/shared-markdown-to-html`, so `GET /` stays in sync with the latest `README.md` after a build.

**Note:** this only fires on `npm run build` — `npm run dev` runs `tsx` directly and never touches `tsc`/`postbuild`, so editing `README.md` during `npm run dev` won't update `GET /` until a build actually runs.

### TypeScript strictness (`tsconfig.json`)

Beyond `strict: true`: `noUncheckedIndexedAccess` (indexed access is `T | undefined`, not `T`), `noEmitOnError` (a broken build produces no `dist/` output), `noUnusedLocals`/`noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. `declaration`/`declarationMap` are deliberately **off** — this is an application, not a package anything imports.

### ESLint (`eslint.config.mjs`)

Flat config: `@eslint/js` recommended → `typescript-eslint` recommended/strict/stylistic → type-checked variants (`recommendedTypeChecked`/`strictTypeChecked`/`stylisticTypeChecked` via `projectService`) → `simple-import-sort` → Prettier (last, disables conflicting stylistic rules). Notable custom rules: `no-floating-promises`/`no-misused-promises`/`require-await`/`await-thenable`/`eqeqeq`/`curly` (error), `no-explicit-any`/`no-unused-vars` (warn), `reportUnusedDisableDirectives` (error).

---

## 18. Shared Packages (`@beautinique/*`)

| Package                                | Purpose                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@beautinique/backend-bullmq`            | `JobProducer` — typed BullMQ wrapper                                                                    |
| `@beautinique/backend-classes`           | `AppError` subclasses (`NotFoundError`, `ValidationError`, `ConflictError`, `UnprocessableEntityError`, ...) |
| `@beautinique/backend-logger`            | `createLogger`/`createHttpLogger` (Pino-based)                                                          |
| `@beautinique/backend-mongoose`          | `connectDb`, `disconnectDB`, `checkDbConnection`, `getConnectionHealth`, `getObjId`, `mongoEvents`, `tryCatchSession` |
| `@beautinique/backend-request`           | `checkServiceAccess`, `checkEmptyRequest`                                                                |
| `@beautinique/backend-response`          | `successResponse`/`errorResponse`/`notFoundResponse`/`tryCatchResponse`                                  |
| `@beautinique/backend-utils`             | `getUser`                                                                                                |
| `@beautinique/backend-zod`               | `validateZod` and every request Zod schema (`categoryZodSchema`, `categoryUpdateZodSchema`, `draftProductStepBodyZodSchema`, `draftProductDetailsZodSchema`) |
| `@beautinique/shared-constants`          | `CATEGORY_LEVELS(_MAP)`, `PRODUCT_STATUSES(_MAP)`, `USER_ROLES`, `SORT_MAP`, `API_METHODS_MAP`, `HEADERS_MAP`, `SERVICE_NAMES_MAP`, `TRY_ON_MAP`/`TRY_ON_CATEGORIES`/`TRY_ON_ALL_SUB_CATEGORIES` |
| `@beautinique/shared-markdown-to-html`   | `generateHtmlFromMarkdown` — used by `scripts/generate-html.mjs`                                        |
| `@beautinique/shared-utils`              | `requireEnv`/`requirePort`, `stringifyData`/`parseData`                                                  |
| `@beautinique/backend-types`             | `TCategoryZodSchema`, `TCategoryUpdateZodSchema`, `TDraftProductStepBodyZodSchema`, `TDraftProductDetailsZodSchema`, `TTryOnSelection`, `TUserRole`, `TProductStatus`, `TSort`, `TCategoryLevel` |

---

## 19. API Response Format

All responses use `@beautinique/backend-response`'s envelope, attached via `app.use(successResponse({ defaultMessage: 'Success.' }))`:

```jsonc
// success
{ "success": true, "message": "Category created successfully", "data": { "...": "..." } }

// error
{ "success": false, "code": "UNPROCESSABLE_ENTITY", "message": "...", "fieldErrors": { ... }, "globalErrors": [ ... ] }
```

`res.success({ statusCode, message, data })` — `data` is omitted entirely (not sent as `null`) when not provided; `statusCode` defaults to `200`.

---

## 20. Data Flow Examples

### Category Creation

```
Client → POST /category { name, level, parent? }
  → Validate parent exists and is one level shallower (if provided)
  → Check no sibling has the same slug
  → Category.save() inside a transaction
  → Flip parent.isLeaf = false (if parent given)
  ← Commit
  → afterCommit: redisCacheManager.category.setCategory(category)
  ← res.success({ statusCode: 201 })
```

### Draft → Publish

```
Client → POST /product/draft { step: 'basicInfo', ... }   (repeated per step)
  → RedisCacheDashboard.saveDraftProductStep() — writes one hash field, 24h TTL on first write

Client → PATCH /product/draft/publish
  → createPendingProductPayload: load full draft from Redis into req.body
  → Validate against draftProductDetailsZodSchema
  → Build Product payload (SKU/slug generation, variant SKUs)
  → product.validate() then product.save({ session })
  ← Commit
  → afterCommit: mark referenced images "used" (media-queue), delete Redis draft
  ← res.success({ statusCode: 201, data: product })
```

### Dashboard Product Lookup

```
Client → GET /product/dashboard/:slug
  → RedisCacheDashboard.getProductBySlug(slug)
  → HIT  → return cached product
  → MISS → Product.findOne({ slug, status: PUBLISHED }).populate('category')
          → afterFinish: cache it (1-day TTL), response already sent
  ← res.success({ data: product })
```

---

## 21. Key Relationships

```
Category ──1→N─── Category    (parent/children, L1 → L2 → L3)
Category ──1→N─── Product     (a product always belongs to one L3 category)
Product  ──N→1─── User         (seller, external — owned by user-service)
Product  ──N→N─── Review       (external references only, no local Review model)
```

- `Category.parent`  → self-referencing ref `Category`
- `Product.category` → ref `Category` (always L3)
- `Product.seller`   → external user id (no local ref/populate)
- `Product.reviews`  → `ref: 'Review'`, but no `Review` model exists in this service

---

## 22. Design Notes / Known Trade-offs

- **Four routes are declared in `METHODS_AND_PATHS` but not wired up in `product.routes.ts`:** `DELETE /product/draft`, `PATCH /product/draft` (edit an already-published product), `PATCH /product/publish` (approve a `PENDING` product — the controller, `publishPendingProductController`, already exists and is fixed/save()-complete, it's just not routed), and `GET /product/products` (a public listing distinct from the dashboard one). These read as intentionally-planned, not-yet-shipped endpoints rather than accidental gaps — wire them up (with the appropriate Zod schema + session/transaction + Redis invalidation, matching the conventions used everywhere else in this service) once the corresponding feature is ready.
- **Public vs. dashboard product lookup caching is asymmetric.** `GET /product/dashboard/:slug` is cache-aside over Redis; `GET /product/:slug` (the public storefront lookup, almost certainly the higher-traffic of the two) hits MongoDB directly on every request. Worth revisiting if storefront traffic grows.
- **`RedisCacheCategory`/`RedisCacheDashboard` degrade gracefully, never crash.** Every Redis operation swallows its own errors and logs a warning (`RedisCacheHelper`); a Redis outage falls through to MongoDB on every cache-aside read path.
- **Category cache writes/deletes are deferred to `res.locals.afterCommit`.** This keeps the Redis cache from ever getting ahead of a transaction that later rolls back. The categories hash also carries a 1-day TTL (set only when the hash doesn't already exist, so it isn't perpetually renewed by routine writes) specifically so that a rare failed Redis delete self-heals via a full MongoDB reseed instead of leaving a stale entry indefinitely.
- **`findOrCreateCategory` (`services/index.ts`) is currently unused** by any controller in this service — it's an upsert helper available for future seed scripts or cross-service use, not part of the live request path today.
- **`authenticate` is exported but unused directly** — every route that needs identity uses `authorize(allowedRoles)` instead, since role-gating is required everywhere identity is.
- **`GET /` regenerates on `npm run build`, not `npm run dev`.** `public/index.html` is generated from `README.md` by the `postbuild` script. Editing this file while running `npm run dev` won't update `GET /` until a build actually runs.
