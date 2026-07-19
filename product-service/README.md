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
| Background jobs / queue    | BullMQ (Redis), via `@beautinique/backend-bullmq` — **producer only**, `media-queue` (see [§19](#19-background-jobs-media-queue-producer-only)) |
| Validation                 | Zod, via `@beautinique/backend-zod` (schemas defined and versioned in a separate `BQ-Packages` repo, not here — see [§6](#6-request-validation-zod-schemas)) |
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
│   │       ├── publishPendingProduct.controller.ts   #   Approve a PENDING product → PUBLISHED (not yet routed, see §25)
│   │       ├── getDraftProduct.controller.ts          #   Fetch the caller's in-progress draft
│   │       ├── getDashboardProducts.controller.ts     #   Paginated/sortable/searchable seller+admin listing
│   │       ├── getDashboardProductBySlug.controller.ts #  Single product lookup for the dashboard (cache-aside)
│   │       ├── getProductBySlug.controller.ts          #  Public storefront product lookup
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

All environment variables are loaded via `dotenv` and validated in `src/envs/index.ts` — every required variable is checked with `requireEnv`/`requirePort` at startup, so a missing or invalid value throws a clear error immediately instead of failing confusingly later. There is no fallback/default for any of these — every one is `required`.

### 4.1 Server & App

| Variable         | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| `PORT`            | HTTP port to listen on                                                               |
| `IS_DEV`          | `"true"` enables pretty logging (`LOGGER_BASE_OPTIONS.pretty`) and stack traces in error responses (`errorResponse({ includeStack: envs.is_dev })`) |
| `SERVICE_NAME`    | Name tag attached to every log line via `createLogger`                               |
| `SERVICE_SECRET`  | Shared secret required in the `X-Service-Secret` header on every `/api/v1/*` request |
| `DATABASE_NAME`   | MongoDB database name, passed to `connectDb` as `options.dbName`                     |

### 4.2 MongoDB

| Variable       | Description               |
| --------------- | -------------------------- |
| `MONGODB_URI`   | MongoDB connection string |

`databaseConfigs.enableGlobalCache` is wired to `envs.is_dev` — Mongoose's global model cache behaves differently in dev vs. production, matching the pattern `@beautinique/backend-mongoose` expects.

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

**This Redis instance is shared** with `media-service`, which runs the `media-queue` worker — it must point to the same instance in both services. Note that the cache Redis (§4.3) and the BullMQ Redis (§4.4) are configured as two entirely independent connections in `configs/index.ts` (`redisClient` vs. `jobProducer`'s `connection`) — they are allowed to point at different physical Redis instances/databases, and typically do in production (cache data is disposable, queue data is not).

---

## 5. Database Models

### 5.1 Category Schema (`category.schema.ts`)

Collection: `categories`

| Field           | Type                | Required | Default   | Notes                                                        |
| ----------------- | --------------------- | ---------- | ----------- | ---------------------------------------------------------------- |
| `name`           | String               | Yes       | —          | Trimmed, 2–120 chars                                            |
| `slug`           | String               | Yes       | —          | Lowercased, auto-derived from `name` on every `validate` (non-unique on its own — uniqueness is enforced by the compound `{parent,slug}` index) |
| `description`    | String               | No        | —          | 10–150 chars; only meaningful for L3 (force-cleared to `undefined` for L1/L2 on every validate, see below) |
| `level`          | Number (enum)        | Yes       | —          | `1` (main), `2` (sub), `3` (final/product-facing) — `CATEGORY_LEVELS_MAP` from `@beautinique/shared-constants` |
| `parent`         | ObjectId ref `Category` | No     | —          | Force-cleared to `undefined` for L1 (root categories have no parent) |
| `isLeaf`         | Boolean              | No        | `true`     | Flipped to `false` when a category gains its first child, back to `true` when its last child is removed/reparented — maintained entirely by the category controllers, never set directly by the client |
| `productCount`   | Number               | No        | —          | Maintained mainly for L3 (product-facing) categories; not currently written to by any controller in this service (see [§25](#25-design-notes--known-trade-offs)) |
| `createdBy`      | ObjectId             | Yes       | —          | Caller's user id, taken from `X-User-Id` at creation time                |
| `updatedBy`      | ObjectId             | No        | —          | Caller's user id, set on every update                                    |

Also has `timestamps: true` (`createdAt`/`updatedAt`), `versionKey: false` (no `__v`), and a case-insensitive `collation: { locale: 'en', strength: 1 }` — `strength: 1` means comparisons ignore case *and* diacritics, which keeps text search and the sibling-uniqueness index forgiving of casing differences.

**Pre-`validate` hook** (`categorySchema.pre('validate', ...)`), runs on every `save()`/`validate()`:
1. If `name` is present, regenerate `slug = generateSlug(name, unique: false)` — i.e. the slug is *always* recomputed from the current `name`, never trusted from client input.
2. If `level === L1`: force `parent = undefined` and `description = undefined`.
3. If `level === L2`: force `description = undefined` (parent is left as-is; L2 requires a parent, enforced at the controller level, not the schema level).

**Indexes:**
- `{ parent: 1, slug: 1 }` **unique** — a category's slug only has to be unique among its siblings (same `parent`), not globally. Two different L2 categories under different L1 parents can share the slug `accessories`, for example.
- `{ name: 'text', slug: 'text', description: 'text' }` — full-text search index (not currently queried by any controller in this service — available for a future admin search UI)
- `{ createdBy: 1, level: 1 }`, `{ parent: 1, level: 1 }`, `{ isLeaf: 1, level: 1 }` — compound filter indexes
- Single-field indexes on `name`, `slug`, `description`, `level`, `parent`, `isLeaf`, `productCount`, `createdBy`, `updatedBy`

### 5.2 Product Schema (`product.schema.ts`)

Collection: `products`

| Field                | Type                        | Required | Default        | Notes                                                     |
| ----------------------- | ----------------------------- | ---------- | ---------------- | --------------------------------------------------------------- |
| `title`                | String                       | Yes       | —              | Trimmed, 2–200 chars                                           |
| `sku`                  | String                       | Yes       | —              | Trimmed, uppercased, globally unique (own `productSchema.index({ sku: 1 }, { unique: true })`, in addition to the `unique: true` implicitly declared on the path) |
| `brand`                | String                       | Yes       | —              | Trimmed, 2–100 chars                                           |
| `originalPrice` / `sellingPrice` | Number             | Yes       | —              | Both `min: 0` at the schema level; the *stronger* rules (`originalPrice > 0` strictly, `sellingPrice <= originalPrice`) are enforced in the `pre('validate')` hook below, not by `min`/`max` |
| `discount`             | Number                       | No        | `0`             | `min: 0, max: 100` — auto-calculated from the two prices on every `validate`, never trusted from client input |
| `stock` / `stockThreshold` | Number                  | No        | `null`          | Only meaningful when `hasVariants: false`; left `null` for variant products (each variant carries its own `stock`/`stockThreshold` instead) |
| `shortDescription`     | String                       | Yes       | —              | Trimmed, 10–300 chars                                           |
| `description`          | String                       | Yes       | —              | Trimmed, **≥107 chars** — the one unusually strict minimum in this schema, presumably to force a substantive product description |
| `instructions` / `ingredients` / `additional` | String       | No        | —              | Trimmed, ≥20 chars each, only when present                       |
| `slug`                 | String                       | Yes       | —              | Trimmed, lowercased, globally unique, generated by the controller (`generateSlug(title + ' ' + l3Category.name)`, unique suffix) — **not** auto-derived by a schema hook the way category's slug is |
| `images` / `thumbnail` | [String] / String            | Yes       | —              | Cloudinary delivery URLs                                          |
| `video`                | String                       | No        | —              | Cloudinary delivery URL                                            |
| `category`             | ObjectId ref `Category`      | Yes       | —              | Always the deepest (L3) category — enforced by the controller, not the schema |
| `seller`               | ObjectId                     | Yes       | —              | Owning seller's user id (external — no local `User` model, no `ref`) |
| `soldCount` / `returnCount` / `totalReviews` / `totalRating` | Number  | No | `0`     | `min: 0`; not written to by any controller in this service today — reserved for order/review services to update directly |
| `averageRating`        | Number                       | No        | `0`             | `min: 0, max: 5`; same as above — reserved for a review service    |
| `reviews`               | [ObjectId ref `Review`]      | No        | `[]`            | External references only — **there is no `Review` model in this service**, `ref: 'Review'` only matters if/when `.populate('reviews')` is called against a connection where that model is registered |
| `hasVariants`           | Boolean                      | Yes       | —              | Gates whether `stock`/`stockThreshold` or `variants` is the source of truth for inventory |
| `variants`             | [variantSchema]              | No        | `[]`            | Required to be non-empty, with unique SKUs, when `hasVariants: true` (enforced in the `pre('validate')` hook, not by `required`/`minlength` on the array path itself) |
| `status`               | String (enum)                | No        | `"PENDING"`     | `DELETED`, `PENDING`, `PUBLISHED`, `REJECTED`, `BLOCKED` — `PRODUCT_STATUSES_MAP` from `@beautinique/shared-constants` |
| `history`              | historySchema                | No        | —              | `approvedBy`/`approvedAt`, `blockedBy`/`blockedAt`, `rejectedBy`/`rejectedAt`/`rejectReason` — populated piecemeal as a product moves through moderation, never all at once |
| `tryOn`                | tryOnSchema                  | No        | —              | Virtual try-on configuration, see [§5.2.2](#522-tryonschema-subdocument) below |

Also has `timestamps: true`, `versionKey: false`.

#### 5.2.1 `variantSchema` (subdocument)

| Field            | Type    | Required | Notes                                    |
| ------------------ | --------- | ---------- | --------------------------------------------- |
| `sku`             | String   | Yes       | Trimmed, uppercased — generated by the controller (`generateSku`), not the schema |
| `type`            | String (enum) | Yes  | `Color` \| `Text` — governs whether the storefront renders `value` as a swatch or a text chip |
| `label`           | String   | Yes       | Trimmed, e.g. `"Ruby Red"`                     |
| `value`           | String   | Yes       | Trimmed — a hex code for `Color`, free text for `Text` |
| `originalPrice` / `sellingPrice` | Number | Yes | `min: 0` at the schema level, plus the same "greater than zero" / "selling ≤ original" rule as the product level, enforced per-variant |
| `discount`        | Number   | No        | `min:0, max:100, default:0` — auto-calculated per variant |
| `stock`           | Number   | Yes       | `min: 0`                                        |
| `stockThreshold`  | Number   | Yes       | `min: 0` — low-stock alert threshold             |
| `images`          | [String] | Yes       | `default: undefined` (explicitly, so an empty `[]` doesn't silently satisfy `required` — Mongoose treats `[]` as satisfying `required` on an array path by default; this default override is what forces a real value) |
| `thumbnail`       | String   | No        | —                                                |

`variantSchema.pre('validate')`: throws `UnprocessableEntityError` if `originalPrice <= 0`, or if `sellingPrice > originalPrice`; then computes `discount = round((originalPrice - sellingPrice) / originalPrice * 100)`.

#### 5.2.2 `tryOnSchema` (subdocument)

| Field         | Type          | Required                                   | Notes                                                    |
| --------------- | --------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `configured`   | Boolean        | Yes, `default: false`                        | Whether the seller has walked through try-on setup at all   |
| `enabled`      | Boolean        | No, `default: false`                         | Whether try-on is actually turned on for this product       |
| `category`     | String (enum)  | Only when `configured`                       | One of `TRY_ON_CATEGORIES`: `LIP`, `EYE`, `HAIR`, `FACE`, `NAIL`, `SKIN` |
| `subCategory`  | String (enum)  | Only when `configured` **and** `category` set | One of `TRY_ON_ALL_SUB_CATEGORIES`, validated against `TRY_ON_MAP[category]` (see table below) |

`TRY_ON_MAP` (from `@beautinique/shared-constants`) — the category → allowed-sub-category relationship enforced by both the path-level `validate` function and the schema's own `pre('validate')` hook:

| Category | Allowed sub-categories                          |
| ---------- | -------------------------------------------------- |
| `LIP`     | `MATTE`, `GLOSS`, `SHIMMER`, `CRAYON`               |
| `EYE`     | `EYEBROW`, `EYELINER`, `KAJAL`, `EYESHADOW`         |
| `HAIR`    | `COLOR`                                             |
| `FACE`    | `CONCEALER`, `FOUNDATION`, `HIGHLIGHTER`, `BLUSH`   |
| `NAIL`    | `GEL`, `LIQUID`                                     |
| `SKIN`    | `MOISTURIZER`, `SERUM`, `TONER`, `CLEANSER`         |

`tryOnSchema.pre('validate')` is the **only** place this relationship is actually checked at save time: if `configured`, it requires both `category` and `subCategory` to be present and requires `subCategory` to be a member of `TRY_ON_MAP[category]`, throwing `UnprocessableEntityError` otherwise. (`productSchema`'s own `pre('validate')` hook does **not** duplicate this check — Mongoose runs a single-nested subdocument's own validators automatically as part of validating the parent, so a second check there would be redundant. An earlier version of this file *did* duplicate it, keyed off `enabled` instead of `configured`, and could throw an unhandled `TypeError` instead of a clean `UnprocessableEntityError` if `enabled: true` was ever reachable without `configured: true` — see [§25](#25-design-notes--known-trade-offs) for why that combination is more reachable than it looks.)

#### 5.2.3 `historySchema` (subdocument)

Purely a bag of optional audit fields — `{ _id: false, versionKey: false }`, no validation of its own: `approvedBy`/`approvedAt` (ObjectId/Date), `blockedBy`/`blockedAt`, `rejectedBy`/`rejectedAt`/`rejectReason` (String). Nothing in this schema enforces that only one of "approved"/"blocked"/"rejected" is ever set — a product's history could in principle accumulate all three sets of fields across its lifecycle (approved once, later blocked), which is presumably intentional as an audit trail rather than a "current state" snapshot (`status` is the current state).

#### 5.2.4 `productSchema.pre('validate')` — top-level rules

Runs after all subdocuments have already run their own `pre('validate')` hooks:

1. **Price**: `originalPrice <= 0` → `UnprocessableEntityError`.
2. **Variants**: if `hasVariants`, requires `variants.length > 0`, requires every variant to have a `sku`, and rejects duplicate SKUs within the same product (`Set`-based check, first duplicate throws immediately).
3. **Price relationship**: `sellingPrice > originalPrice` → `UnprocessableEntityError`.
4. **Discount**: `discount = round((originalPrice - sellingPrice) / originalPrice * 100)` — see [§10.1](#101-discount-calculation-worked-example) for a worked example.

Try-on validation is *not* part of this hook (see §5.2.2 above).

#### 5.2.5 Indexes

Text search (`title`, `brand`, `shortDescription`), unique `sku`, `{category,status}`, `{seller,status,createdAt}`, `sellingPrice`, `soldCount` (descending), `averageRating` (descending), `{status,createdAt}` (descending), `tryOn.configured`, `hasVariants`, and three category+status compound indexes (`+sellingPrice`, `+averageRating`, `+soldCount`) built specifically to serve category-scoped, price/rating/sales-sorted storefront listings without an in-memory sort.

---

## 6. Request Validation (Zod Schemas)

Every mutating route's request body is validated by `validateZod({ body: <schema> })` (`@beautinique/backend-zod`) **before** the controller runs. The schemas themselves live in a separate published package (`@beautinique/backend-zod`, versioned independently in the `BQ-Packages` repo) — this section documents the *shape* they currently enforce, inferred from the package's own type declarations, so a reader doesn't have to leave this repo to know what a valid request body looks like.

### 6.1 `categoryZodSchema` — `POST /category`

```jsonc
{
  "name": "string, 2-120 chars",
  "level": 1 | 2 | 3,
  "parent": "ObjectId string — required for level 2/3, absent for level 1",
  "description": "string, 10-150 chars — level 3 only"
}
```

### 6.2 `categoryUpdateZodSchema` — `PATCH /category/:categoryId`

Same shape as above, but every field is optional **except** `level` (which the controller uses purely to confirm you're not trying to change it — see [§9.2](#92-update-patch-categorycategoryid)). Whether the `parent` *key* is present at all in the JSON body (as opposed to what its value is) changes controller behavior — see §9.2.

### 6.3 `draftProductStepBodyZodSchema` — `POST /product/draft`

A discriminated union on a **string** `step` field — the request body for `POST /product/draft` is always exactly one of these five shapes, not a numbered/partial step:

| `step` value            | Body shape                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `"basicInfo"`              | `{ step, title, brand, originalPrice, sellingPrice, l1Category:{_id,name}, l2Category:{_id,name}, l3Category:{_id,name} }` |
| `"mediaAndGallery"`        | `{ step, thumbnail: url, images: url[], video?: url }`                                              |
| `"descriptionAndContent"`  | `{ step, shortDescription, description, instructions?, ingredients?, additional? }` — `description`/`instructions`/`ingredients`/`additional` each pass through a Zod transform before reaching the controller (almost certainly trimming/sanitizing rich-text HTML, not just validating it) |
| `"stockAndVariants"`       | Discriminated union on `hasVariants`: `{ step, hasVariants:false, stock, stockThreshold }` **or** `{ step, hasVariants:true, variants:[{type,label,value,originalPrice,sellingPrice,stock,stockThreshold,images,thumbnail?}] }` |
| `"tryOnConfiguration"`     | Discriminated union on `enabled`: `{ step, enabled:false, tryOn?:{category,subCategory} }` **or** `{ step, enabled:true, tryOn:{category,subCategory} }` — see the caveat in [§25](#25-design-notes--known-trade-offs) about this specific union in the published package |

`RedisCacheDashboard.saveDraftProductStep` (see [§13](#13-redis-cache-classesredis)) uses `stepData.step` **directly** as the Redis hash field name — so the five `step` values above are literally the five hash field names inside `bq:products:draft:<userId>`.

### 6.4 `draftProductDetailsZodSchema` — `PATCH /product/draft/publish`

The full, assembled draft — an object with all five keys from §6.3 required simultaneously (`basicInfo`, `mediaAndGallery`, `descriptionAndContent`, `stockAndVariants`, `tryOnConfiguration`), each shaped exactly as its corresponding step body above (minus the discriminant's role as a top-level field — it's nested under its own key here instead of being the request's own discriminant). The client never actually sends this body directly for `PATCH /product/draft/publish` — `createPendingProductPayload` middleware assembles it from the Redis draft hash and overwrites `req.body` with it before validation runs (see [§14](#14-middlewares)).

---

## 7. API Routes

All `/api/v1/*` routes require the `X-Service-Secret` header and a ready MongoDB connection (`checkServiceAccess` + `checkDbConnection`, both mounted in `app.ts`, scoped to `/api/v1`). `/`, `/docs`, and `/health` are intentionally outside that and reachable without either.

### 7.1 Home, Docs & Health

| Method | Path        | Auth | Description                                                      |
| -------- | ------------- | ------ | -------------------------------------------------------------------- |
| GET     | `/`          | None  | This README, pre-rendered to HTML by `scripts/generate-html.mjs` |
| GET     | `/docs`      | None  | Interactive Swagger UI (spec in `src/docs/openapi.ts`)             |
| GET     | `/health`    | None  | Liveness + MongoDB connection status                              |

### 7.2 Category — `/api/v1/category`

| Method | Path                     | Auth                  | Description                                                    |
| -------- | --------------------------- | ------------------------ | -------------------------------------------------------------------- |
| POST    | `/category`                | ADMIN, MASTER          | Create a category (L1/L2/L3, with parent/level rules)                |
| PATCH   | `/category/:categoryId`    | ADMIN, MASTER          | Update a category (name/parent/description; level is immutable)      |
| DELETE  | `/category/:categoryId`    | ADMIN, MASTER          | Delete a leaf category with zero products                            |
| GET     | `/category/by-parent-level`| ADMIN, MASTER, SELLER  | List categories filtered by `level` + `parent` (cache-aside)         |
| GET     | `/category/by-hierarchy`   | None                   | Full L1→L2→L3 nested tree (cache-aside)                              |

### 7.3 Product — `/api/v1/product`

| Method | Path                              | Auth                  | Description                                                    |
| -------- | ------------------------------------ | ------------------------ | -------------------------------------------------------------------- |
| POST    | `/product/draft`                   | ADMIN, SELLER, MASTER  | Save one step of a multi-step draft into the Redis draft hash         |
| GET     | `/product/draft`                   | ADMIN, SELLER, MASTER  | Fetch the caller's current in-progress draft                          |
| PATCH   | `/product/draft/publish`           | ADMIN, SELLER, MASTER  | Turn a **complete** draft into a real `Product` document (`PENDING` for sellers, `PUBLISHED` directly for admins) |
| GET     | `/product/dashboard/products`      | ADMIN, SELLER, MASTER  | Paginated/sortable/Atlas-Search listing, scoped to own products for sellers |
| GET     | `/product/dashboard/:slug`         | ADMIN, SELLER, MASTER  | Single product lookup for the dashboard (cache-aside, 1-day TTL)      |
| GET     | `/product/:slug`                   | None                   | Public storefront lookup — only `PUBLISHED` products                 |
| GET     | `/product/suggestions`             | None                   | Atlas Search autocomplete (title/brand/slug/shortDescription)          |

**Declared but not currently wired to a route** (present in `METHODS_AND_PATHS`, `src/constants/index.ts`, but with no matching route registration in `product.routes.ts`) — see [§25](#25-design-notes--known-trade-offs):

| Method | Path                    | Intended purpose (from the constant's own comment)              |
| -------- | -------------------------- | ---------------------------------------------------------------------- |
| DELETE  | `/product/draft`          | Discard the caller's in-progress draft                                  |
| PATCH   | `/product/draft`          | Edit an already-published product's draft-style fields                 |
| PATCH   | `/product/publish`        | Approve a `PENDING` product → `PUBLISHED` (controller exists: `publishPendingProductController`, just not routed) |
| GET     | `/product/products`       | A public product listing, distinct from the dashboard one              |

---

## 8. Request Headers

| Header               | Purpose                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `X-Service-Secret`     | Service-to-service authentication (`checkServiceAccess`, required on `/api/v1/*`) |
| `X-User-Id`             | End user's id (forwarded by the gateway/caller, required wherever a role is listed under "Auth" in [§7](#7-api-routes)) |
| `X-User-Role`           | End user's role, defaults to `USER` if not sent                    |

There's no JWT here — the gateway/upstream service is expected to have already authenticated the user and forwarded their identity via `X-User-Id`/`X-User-Role`. Unlike `user-service`, there is no `Authorization`/OTP-session-token header in this service — nothing here issues or checks temporary tokens.

---

## 9. Category Management

### 9.1 Create (`POST /category`)

1. If `parent` is given, it must exist and be exactly one level shallower than the new category's `level` (L2 needs an L1 parent, L3 needs an L2 parent) — checked via a direct `Category.findById(parent).select('level')` inside the same transaction, throwing `NotFoundError`/`UnprocessableEntityError` as appropriate.
2. Duplicate check: `Category.findOne({ parent, slug: generateSlug(name, false) })` — no sibling (same `parent`) may already have the same slug.
3. `new Category({...}).save({ session })` — on a MongoDB duplicate-key error (E11000, from a concurrent create racing the same slug between the check in step 2 and the actual insert) the error is caught and converted to a friendly `ConflictError` rather than a raw 500.
4. If a `parent` was set, that parent's `isLeaf` flips to `false` via a second `findByIdAndUpdate` in the same transaction.
5. The Redis category cache is updated **after the transaction commits** (`res.locals.afterCommit`), so a rollback never leaves a phantom category cached.
6. Response: `201`, `{ message: 'Category created successfully' }` (the created category itself is **not** echoed back in `data`).

### 9.2 Update (`PATCH /category/:categoryId`)

1. `level` is immutable — the request body's `level` is compared against the existing document's; a mismatch throws `ConflictError`, before anything else runs.
2. `parent` is only touched **if the key is present in the request body at all** (`'parent' in restBody`) — this is a deliberate "partial update" pattern: omitting `parent` entirely leaves the existing parent completely untouched, while explicitly sending it (even as an empty/falsy value) triggers full re-validation (self-parent check, level-shallower-by-one check) and reparenting.
3. If `name` changes, the slug is regenerated (`generateSlug(name, false)`) and re-checked for duplicates among the (possibly new) siblings — `_id: { $ne: categoryId }` excludes the document being updated itself from the duplicate check.
4. `Category.findByIdAndUpdate(categoryId, payload, { session, new: true, lean: true, runValidators: true })` — `runValidators: true` matters here since `findByIdAndUpdate` otherwise bypasses Mongoose validators by default.
5. After the update, if the parent actually changed: the **old** parent's `isLeaf` is recalculated (back to `true` if `countDocuments({ parent: oldParent, _id: {$ne: categoryId} }) === 0`) and the **new** parent's `isLeaf` is unconditionally forced to `false`.
6. Redis cache update is deferred to `res.locals.afterCommit`, same as create.
7. Response: `200`, `{ message: 'Category updated successfully' }`.

### 9.3 Delete (`DELETE /category/:categoryId`)

1. Only a **leaf** category (`isLeaf: true`) can be deleted — `UnprocessableEntityError('Cannot delete category with child categories')` otherwise.
2. An L3 category with `productCount > 0` cannot be deleted — `UnprocessableEntityError('Cannot delete category with products')`. (Levels 1/2 don't carry a meaningful `productCount`, so this check only fires for `level === L3`.)
3. `Category.findByIdAndDelete(categoryObjId, { session })`.
4. If the deleted category was its parent's only child (`countDocuments({ parent }) === 0` after the delete), the parent's `isLeaf` flips back to `true`.
5. Redis cache delete is deferred to `res.locals.afterCommit` — if the Redis delete itself ever fails, it's caught and logged (`RedisCacheHelper` swallows Redis-level errors), and the categories hash's 1-day TTL (see [§13](#13-redis-cache-classesredis)) bounds how long a stale entry can survive before a full reseed from MongoDB self-heals it.
6. Response: `200`, `{ message: 'Category deleted successfully' }`.

### 9.4 Listing

- `GET /category/by-parent-level?level=&parent=` — filters the cached category list in memory; omitting `level` returns everything, L1 ignores `parent` entirely (every L1 category is returned regardless of the `parent` query param).
- `GET /category/by-hierarchy` — builds the full L1→L2→L3 tree in memory: groups the flat cached list into a `Map<parentId, category[]>`, then recursively attaches each node's children under a `subcategories` key, starting from the L1 roots.

Both read exclusively from `RedisCacheCategory.getAllCategories()` (cache-aside, seeds itself from MongoDB on a cold/expired cache) — neither queries MongoDB directly, and neither requires the `X-Service-Secret`+DB-ready gate to behave any differently than a normal `/api/v1/*` route.

---

## 10. Product Flow

### 10.1 Discount Calculation (worked example)

Both `productSchema` and `variantSchema` compute `discount` identically:

```
discount = round( (originalPrice - sellingPrice) / originalPrice × 100 )
```

Example: `originalPrice = 999`, `sellingPrice = 799` → `(999 - 799) / 999 × 100 = 20.02...` → rounds to **`20`**.

### 10.2 SKU Generation (worked example)

`generateSku({ data, prefix?, unique = true })` (`utils/index.ts`) takes each value in `data`, strips non-alphanumeric characters, takes the first 3 characters, uppercases it, and joins the results with `-`; if `unique` (the default), it appends a random 6-digit, zero-padded suffix.

**Product SKU** — called from `publishDraftProductController` with `{ title, brand, l1Cat: l1Category.name, l2Cat: l2Category.name, l3Cat: l3Category.name }`:

```
title = "Ruby Red Lipstick"   → "Rub" → "RUB"
brand = "MAC Cosmetics"       → "MAC" → "MAC"
l1Cat = "Makeup"              → "Mak" → "MAK"
l2Cat = "Lips"                → "Lip" → "LIP"
l3Cat = "Lipstick"            → "Lip" → "LIP"

joined:      RUB-MAC-MAK-LIP-LIP
+ random:    RUB-MAC-MAK-LIP-LIP-042817
```

**Variant SKU** — called per-variant with `{ data: { label: variant.label }, prefix: productSku }`, e.g. `label = "Ruby Red"` → `"Rub"` → `"RUB"`, prefixed with the product SKU: `RUB-MAC-MAK-LIP-LIP-042817-RUB-583910`.

### 10.3 Slug Generation

`generateSlug(text, unique = true)` runs `slugify(text, { lower: true, strict: true, trim: true })` and, when `unique`, appends `-${Date.now()}`.

- **Products** always use `unique: true` (the default): `generateSlug(`${title} ${l3Category.name}`)` → e.g. `"Ruby Red Lipstick" + "Lipstick"` → `ruby-red-lipstick-lipstick-1737270000000`.
- **Categories** always call it with `unique: false`: `generateSlug(name, false)` → e.g. `"Lip Care"` → `lip-care` — no timestamp, because sibling-scoped uniqueness is already guaranteed by the `{parent,slug}` compound index, so a random/time suffix would only make URLs uglier for no benefit.

### 10.4 Draft → Publish

1. `POST /product/draft` is called once per step (see [§6.3](#63-draftproductstepbodyzodschema--post-productdraft)), each call writing one field — keyed by the literal `step` string (`basicInfo`, `mediaAndGallery`, `descriptionAndContent`, `stockAndVariants`, or `tryOnConfiguration`) — into a per-user Redis hash (`bq:products:draft:<userId>`). TTL is fixed at 24h from the **first** step written for a fresh draft, and is **not** renewed on subsequent steps — a slow multi-day form-fill will still expire 24h after it was started, not 24h after the last edit.
2. `GET /product/draft` returns whatever has been saved so far, with any never-touched step keys coming back as `undefined`.
3. `PATCH /product/draft/publish`:
   - `createPendingProductPayload` middleware loads the full draft from Redis into `req.body`, throwing `NotFoundError('Draft expired')` if nothing is cached (TTL elapsed or the draft was never started) — the client sends **no body** of its own for this request.
   - The assembled body is validated against `draftProductDetailsZodSchema` — every one of the five steps must be present and individually valid, or Zod rejects the whole request before the controller runs.
   - The controller builds a full `Product` payload from the draft: SKU generation (§10.2), slug generation (§10.3), image-URL extraction from rich-text fields (for later "mark as used" cleanup, see [§19](#19-background-jobs-media-queue-producer-only)), and per-variant SKU generation.
   - `status` is set to `PENDING` for a `SELLER` caller, or `PUBLISHED` (with `history.approvedAt`/`history.approvedBy` stamped immediately) for `ADMIN`/`MASTER`.
   - `product.validate()` is called **explicitly** before `save()`, so Mongoose validation errors surface as a clean response before any DB write is even attempted (rather than surfacing from inside `save()` itself, which would behave identically here but is worth calling out as a deliberate style choice — it separates "is this data valid" from "did the write succeed").
   - After commit: every image/thumbnail/video URL referenced by the product (including images embedded inside the rich-text `description`/`ingredients`/`instructions`/`additional` fields, extracted via a `<img src="...">` regex) is resolved to a Cloudinary public id and enqueued as a `mark-multiple-media-as-used` job, and the Redis draft is deleted.
4. Response: `201`, `{ message: 'Product sent for review', data: product.toObject() }`.

### 10.5 Pending Approval (`publishPendingProductController`)

Approves a `PENDING` product (created by a non-admin seller) into `PUBLISHED`: sets `status = PUBLISHED`, initializes `history` if it doesn't already exist (a seller-created `PENDING` product has no `history` subdocument at all until it's first approved/blocked/rejected), then stamps `history.approvedBy`/`history.approvedAt` and calls `product.save()`. **Not currently wired to a route** — see [§25](#25-design-notes--known-trade-offs).

### 10.6 Dashboard Listing (`GET /product/dashboard/products`)

- Sellers only ever see their own products (`seller` scoped from `X-User-Id`); admins/masters see everything, optionally filtered by `status`/`category` query params.
- Pagination: `page` (default `1`), `limit` (default `10`), both clamped to a minimum of `1`.
- Sorting: `sortBy` (one of `createdAt`, `updatedAt`, `title`, `sellingPrice`, `originalPrice`, `soldCount`; default `createdAt`), `sortOrder` (`asc`/`desc`, default `desc`).
- With a non-empty `search` query, uses an Atlas Search (`$search`) pipeline against the `dashboard-products` index (autocomplete on `title`, fuzzy-matched with `maxEdits: 1, prefixLength: 2`, plus an `equals`-filter array built from the same seller/status/category scoping) with a `$facet` stage producing paginated results + total count in a single round trip. Without a search term, falls back to a plain `Product.find(matchStage).sort().skip().limit()` + `Product.countDocuments(matchStage)`.
- Either path also runs a separate `$group`-by-`status` aggregation (scoped by seller/category, deliberately **not** by status) to populate a status-count summary (`{ ALL, DELETED, PENDING, PUBLISHED, REJECTED, BLOCKED }`) alongside the page of results — this is why the count query and the listing query use two *different* match objects (`statusMatch` excludes `status`, `matchStage` includes it): the counts need to reflect all statuses simultaneously, the listing needs to reflect only the requested one.
- Only projects `PRODUCT_DASHBOARD_PROJECTION` (`src/constants/index.ts`) — notably, `variants` is projected as `variants.stock` only (each returned variant is just `{ _id, stock }`, not the full variant subdocument), which `TDashboardListProduct['variants']` is typed to match exactly, so the API's advertised response shape and its actual runtime shape agree.

### 10.7 Public Lookup & Suggestions

- `GET /product/:slug` — only ever returns `PUBLISHED` products, populates `category.name` (excluding `category._id` via the `'name -_id'` projection string), queries MongoDB directly on every request (no cache layer — see [§25](#25-design-notes--known-trade-offs)).
- `GET /product/dashboard/:slug` — cache-aside over Redis (1-day TTL, deferred cache population via `res.locals.afterFinish` so the cache write happens after the response has already been sent, never delaying it), excludes `variants.stockThreshold` from the DB projection (an internal restock-alert number the dashboard consumer doesn't need).
- `GET /product/suggestions?search=` — Atlas Search pipeline against the `product-search` index: a `must` clause requiring a sequential, fuzzy-matched (`maxEdits: 1`) autocomplete hit on `title` (weight `10`), plus a `should` clause of autocomplete on `brand` (weight `5`) and `slug` (weight `2`) and a fuzzy `text` match on `shortDescription` (weight `1`); post-filtered to `status: PUBLISHED`, projected to `{_id, title, slug, thumbnail, brand}`, and capped at `5` results. An empty/whitespace-only `search` short-circuits to `{ data: [] }` without ever touching MongoDB.

---

## 11. Validation Rules Deep-Dive

A consolidated view of every business rule enforced somewhere between the Zod layer (§6) and the Mongoose layer (§5), organized by entity rather than by file, since the two layers interleave:

### 11.1 Category

| Rule | Enforced by | Failure |
| ------ | ------------- | --------- |
| `name` 2–120 chars | Mongoose (`minlength`/`maxlength`) | Mongoose `ValidationError` |
| `slug` unique per sibling (`parent`+`slug`) | Mongo unique index + a pre-flight `findOne` duplicate check | `ConflictError` |
| `level` immutable after creation | Controller-level comparison (`updateCategoryController`) | `ConflictError` |
| L2 parent must be an L1 category; L3 parent must be an L2 category | Controller-level `findById(parent).level` check | `UnprocessableEntityError` |
| A category cannot be its own parent | Controller-level `parent.equals(categoryId)` check (update only) | `ConflictError` |
| Only a leaf category (`isLeaf`) can be deleted | Controller-level check | `UnprocessableEntityError` |
| An L3 category with `productCount > 0` cannot be deleted | Controller-level check | `UnprocessableEntityError` |
| L1 categories never have a `parent` or `description` | Mongoose `pre('validate')` (force-cleared, not rejected) | — (silently normalized) |
| L2 categories never have a `description` | Mongoose `pre('validate')` (force-cleared) | — (silently normalized) |

### 11.2 Product

| Rule | Enforced by | Failure |
| ------ | ------------- | --------- |
| `originalPrice > 0` | Mongoose `pre('validate')` | `UnprocessableEntityError` |
| `sellingPrice <= originalPrice` | Mongoose `pre('validate')` | `UnprocessableEntityError` |
| `description` ≥ 107 chars | Mongoose `minlength` | Mongoose `ValidationError` |
| `hasVariants: true` requires ≥1 variant | Mongoose `pre('validate')` | `UnprocessableEntityError` |
| Variant SKUs unique within a product | Mongoose `pre('validate')` (`Set`-based check) | `UnprocessableEntityError` |
| `sku` globally unique | Mongo unique index | Mongo `E11000` (not currently translated to a friendly error by any product controller — see [§25](#25-design-notes--known-trade-offs)) |
| `slug` globally unique | Mongo unique index, plus timestamp-suffixed generation making a collision astronomically unlikely | Mongo `E11000` |

### 11.3 Variant (per-item, inside `hasVariants: true` products)

| Rule | Enforced by | Failure |
| ------ | ------------- | --------- |
| `originalPrice > 0` | `variantSchema.pre('validate')` | `UnprocessableEntityError` |
| `sellingPrice <= originalPrice` | `variantSchema.pre('validate')` | `UnprocessableEntityError` |
| `images` must be a real, non-empty array | `default: undefined` override on the array path | Mongoose `ValidationError` (required) |

### 11.4 Try-On

| Rule | Enforced by | Failure |
| ------ | ------------- | --------- |
| `category`/`subCategory` required when `configured: true` | `tryOnSchema` path-level `required` functions | Mongoose `ValidationError` |
| `subCategory` must belong to `TRY_ON_MAP[category]` | `tryOnSchema` path-level `validate`, re-checked in `tryOnSchema.pre('validate')` | `UnprocessableEntityError` |

---

## 12. Search Infrastructure — Atlas Search Indexes

Two named MongoDB Atlas Search indexes are referenced **by name only** in application code (`utils/index.ts`, `getDashboardProducts.controller.ts`) — they must exist and be configured directly in Atlas; nothing in this repository creates or manages them.

| Index name          | Used by                             | Indexed fields (as used in queries)                          |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `product-search`      | `GET /product/suggestions`            | `title` (autocomplete), `brand` (autocomplete), `slug` (autocomplete), `shortDescription` (text) |
| `dashboard-products`  | `GET /product/dashboard/products` (only when `search` is provided) | `title` (autocomplete), plus `equals`-filterable `seller`, `status`, `category` |

If either index is missing, renamed, or out of sync with the fields above in the actual MongoDB Atlas cluster, the corresponding `$search` aggregation stage will fail at query time with a MongoDB error — this is not something `tsc`, `eslint`, or a local MongoDB instance (Atlas Search is an Atlas-only feature, unavailable against a plain self-hosted `mongod`) can catch ahead of time.

---

## 13. Redis Cache (`classes/redis/`)

A `RedisCacheManager` singleton (instantiated once in `configs/index.ts`, exported as `redisCacheManager`) wraps a single `redis` client and exposes two sub-caches, `.category` (`RedisCacheCategory`) and `.dashboard` (`RedisCacheDashboard`), both extending the shared `RedisCacheHelper` base class.

### Key Prefixes

| Prefix                                  | Purpose                        |
| ------------------------------------------ | ------------------------------------- |
| `bq:products:categories`                   | Single hash holding every category, keyed by category id |
| `bq:products:draft:<userId>`               | One user's in-progress draft product, keyed by step name (§6.3)   |
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
| `saveDraftProductStep(userId, body)`| Write one step's field (`body.step`) into the draft hash (24h TTL, fixed from first write) |
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

## 14. Middlewares

### `authenticate` (`middlewares/auth.middleware.ts`)

Reads `X-User-Id` (throws `AuthenticationError` if missing) and `X-User-Role` (defaults to `USER`), attaches `{ _id, role }` to `req.user`. Exported but not currently mounted on any route directly — `authorize` (below) is used everywhere instead, since every mutating/dashboard route also needs a role check.

### `authorize(allowedRoles)` (`middlewares/auth.middleware.ts`)

Factory middleware — same header extraction as `authenticate`, plus throws `AuthorizationError` if `X-User-Role` isn't in `allowedRoles`. Mounted on every category-management route and both the `/product/draft/*` and `/product/dashboard/*` route groups.

### `createPendingProductPayload` (`middlewares/createPendingProductPayload.middleware.ts`)

Loads the caller's Redis draft (`redisCacheManager.dashboard.getDraftProduct`) and overwrites `req.body` with it before `PATCH /product/draft/publish` reaches Zod validation — throws `NotFoundError('Draft expired')` if nothing is cached. This runs **before** `checkEmptyRequest`/`validateZod` in the route chain, which is why the client can call this endpoint with an empty body: by the time the emptiness/validation checks run, `req.body` already holds the assembled draft, not whatever (if anything) the client actually sent.

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

## 15. Services Layer (`services/index.ts`)

| Function                                   | Description                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `findOrCreateCategory({name,slug,parent,level,session})` | Upsert helper (`findOneAndUpdate` + `$setOnInsert`, `upsert: true`) — not currently called from any controller in this service; available for cross-service or seed use |

---

## 16. Utilities (`utils/index.ts`)

| Function                                  | Description                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `generateSlug(text, unique = true)`            | `slugify` + optional `-<timestamp>` suffix — see [§10.3](#103-slug-generation)          |
| `getMinimalCategory(category)`                 | Client/cache-facing category shape — `_id` as string; `parent`/`description` only included for L2/L3 as applicable |
| `generateSku({data, prefix, unique})`          | Builds an uppercase SKU — see [§10.2](#102-sku-generation-worked-example)              |
| `getCloudinaryPublicIdFromUrl(url)`            | Extracts a Cloudinary public id from a delivery URL. Example: `https://res.cloudinary.com/demo/image/upload/v1690000000/products/lipstick_red.jpg` → pathname `/demo/image/upload/v1690000000/products/lipstick_red.jpg` → regex captures `products/lipstick_red.jpg` (skipping any transformation segments and the `v<digits>/` version prefix) → strips the extension → `products/lipstick_red`. Throws `UnprocessableEntityError` if the URL doesn't match the expected `/upload/.../...` shape. |
| `extractImageUrlsFromHtml(html)`               | Regex-extracts every `<img src="...">` from a rich-text field (used to find images to mark "used" in `media-queue`) |
| `getProductSuggestionsPipeline(query)`         | Builds the Atlas `$search` aggregation pipeline for `/product/suggestions` — see [§12](#12-search-infrastructure--atlas-search-indexes) |
| `getInitialProductCountsByStatus()`            | Zero-filled `{ ALL, DELETED, PENDING, PUBLISHED, REJECTED, BLOCKED }` counter object    |
| `populateProductCountsByStatus(counts, rows)`  | Folds a `$group`-by-status aggregation result into the counter object above             |

---

## 17. Error Handling

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

## 18. Server Lifecycle

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

`server.ts` also configures `keepAliveTimeout` (65s) and `headersTimeout` (66s, always 1s ahead of `keepAliveTimeout`) — the standard fix for the race condition where a load balancer's own keep-alive timeout is shorter than Node's, which otherwise intermittently kills in-flight requests right as they arrive.

---

## 19. Background Jobs (`media-queue`, producer only)

This service **only produces** onto `media-queue` — it doesn't run a worker for anything. `jobProducer` (`@beautinique/backend-bullmq`'s `JobProducer`, configured in `configs/index.ts`) is used from `publishDraftProductController`.

| Job name                       | Enqueued from                     | Consumed by       |
| ---------------------------------- | ------------------------------------ | ----------------------- |
| `mark-multiple-media-as-used`      | `publishDraftProductController` (`afterCommit`) | `media-service` |

Every image/thumbnail/video URL referenced by a newly-published product (including images embedded in the rich-text `description`/`ingredients`/`instructions`/`additional` fields) is resolved to a Cloudinary public id and enqueued for the media service to mark as in-use, so orphan-cleanup jobs elsewhere don't delete assets that a product is actively using. If `uniquePublicIds.length === 0` (a product with no extractable images, which shouldn't happen given `images`/`thumbnail` are required, but could for a product with no rich-text-embedded images), the job simply isn't enqueued — the `afterCommit` task still runs to delete the Redis draft either way.

**Retry/backoff:** configured per-call for this job specifically (`attempts: 5, backoff: { type: 'exponential', delay: 5000 }`), on top of the `jobProducer`'s own defaults (`attempts: 3`, `backoff: { type: 'exponential', delay: 2000 }`, `removeOnComplete: { age: 30, count: 5 }`, `removeOnFail: { age: 1800, count: 10 }`).

The `BULL_MQ_*` env vars must point to the **same** Redis instance as `media-service`'s BullMQ connection, or enqueued jobs will never be picked up.

---

## 20. Build & Run Commands

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

## 21. Shared Packages (`@beautinique/*`)

| Package                                | Purpose                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@beautinique/backend-bullmq`            | `JobProducer` — typed BullMQ wrapper                                                                    |
| `@beautinique/backend-classes`           | `AppError` subclasses (`NotFoundError`, `ValidationError`, `ConflictError`, `UnprocessableEntityError`, ...) |
| `@beautinique/backend-logger`            | `createLogger`/`createHttpLogger` (Pino-based)                                                          |
| `@beautinique/backend-mongoose`          | `connectDb`, `disconnectDB`, `checkDbConnection`, `getConnectionHealth`, `getObjId`, `mongoEvents`, `tryCatchSession` |
| `@beautinique/backend-request`           | `checkServiceAccess`, `checkEmptyRequest`                                                                |
| `@beautinique/backend-response`          | `successResponse`/`errorResponse`/`notFoundResponse`/`tryCatchResponse`                                  |
| `@beautinique/backend-utils`             | `getUser`                                                                                                |
| `@beautinique/backend-zod`               | `validateZod` and every request Zod schema (`categoryZodSchema`, `categoryUpdateZodSchema`, `draftProductStepBodyZodSchema`, `draftProductDetailsZodSchema`, plus the smaller per-field schemas — `productMediaAndGallerySchema`, `productVariantZodSchema`, `productStockAndVariantsSchema`, etc. — that those two are assembled from) |
| `@beautinique/shared-constants`          | `CATEGORY_LEVELS(_MAP)`, `PRODUCT_STATUSES(_MAP)`, `USER_ROLES`, `SORT_MAP`, `API_METHODS_MAP`, `HEADERS_MAP`, `SERVICE_NAMES_MAP`, `TRY_ON_MAP`/`TRY_ON_CATEGORIES`/`TRY_ON_ALL_SUB_CATEGORIES` |
| `@beautinique/shared-markdown-to-html`   | `generateHtmlFromMarkdown` — used by `scripts/generate-html.mjs`                                        |
| `@beautinique/shared-utils`              | `requireEnv`/`requirePort`, `stringifyData`/`parseData`                                                  |
| `@beautinique/backend-types`             | `TCategoryZodSchema`, `TCategoryUpdateZodSchema`, `TDraftProductStepBodyZodSchema`, `TDraftProductDetailsZodSchema`, `TTryOnSelection`, `TUserRole`, `TProductStatus`, `TSort`, `TCategoryLevel` — all `TInfer<typeof ...ZodSchema>` re-exports, so this package and `@beautinique/backend-zod` must always be upgraded together (a version of one that's out of sync with the other is exactly the class of bug that showed up mid-development on this service — see [§25](#25-design-notes--known-trade-offs)) |

---

## 22. API Response Format

All responses use `@beautinique/backend-response`'s envelope, attached via `app.use(successResponse({ defaultMessage: 'Success.' }))`:

```jsonc
// success
{ "success": true, "message": "Category created successfully", "data": { "...": "..." } }

// error
{ "success": false, "code": "UNPROCESSABLE_ENTITY", "message": "...", "fieldErrors": { ... }, "globalErrors": [ ... ] }
```

`res.success({ statusCode, message, data })` — `data` is omitted entirely (not sent as `null`) when not provided; `statusCode` defaults to `200`.

---

## 23. Data Flow Examples

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

### Category Update (parent change)

```
Client → PATCH /category/:id { name?, level, parent? }
  → level must match existing (else ConflictError)
  → IF 'parent' in body: validate new parent (self-check, level-shallower-by-one check)
  → IF name given: regenerate slug, re-check duplicate among (new) siblings
  → Category.findByIdAndUpdate(..., { runValidators: true }) inside a transaction
  → IF parent changed: recalc old parent's isLeaf, force new parent's isLeaf = false
  ← Commit
  → afterCommit: redisCacheManager.category.setCategory(updatedCategory)
  ← res.success({ message: 'Category updated successfully' })
```

### Draft → Publish

```
Client → POST /product/draft { step: 'basicInfo', title, brand, originalPrice, sellingPrice, l1Category, l2Category, l3Category }
Client → POST /product/draft { step: 'mediaAndGallery', thumbnail, images, video? }
Client → POST /product/draft { step: 'descriptionAndContent', shortDescription, description, ... }
Client → POST /product/draft { step: 'stockAndVariants', hasVariants, ... }
Client → POST /product/draft { step: 'tryOnConfiguration', enabled, tryOn? }
  → each call: RedisCacheDashboard.saveDraftProductStep() — writes one hash field, 24h TTL fixed from first write

Client → PATCH /product/draft/publish   (no request body)
  → createPendingProductPayload: load full draft from Redis into req.body
  → Validate against draftProductDetailsZodSchema (all 5 steps required)
  → Build Product payload (SKU/slug generation, variant SKUs)
  → product.validate() then product.save({ session })
  ← Commit
  → afterCommit: mark referenced images "used" (media-queue), delete Redis draft
  ← res.success({ statusCode: 201, data: product })
```

### Dashboard Product Search

```
Client → GET /product/dashboard/products?search=lipstick&page=1&limit=10
  → Atlas $search on 'dashboard-products' index: autocomplete(title) + equals-filter(seller/status/category)
  → $facet: paginated products (projected via PRODUCT_DASHBOARD_PROJECTION) + total count
  → separate $group-by-status aggregation for the counts summary (not filtered by status)
  ← res.success({ data: { products, pagination, counts } })
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

## 24. Key Relationships

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

## 25. Design Notes / Known Trade-offs

- **Four routes are declared in `METHODS_AND_PATHS` but not wired up in `product.routes.ts`:** `DELETE /product/draft`, `PATCH /product/draft` (edit an already-published product), `PATCH /product/publish` (approve a `PENDING` product — the controller, `publishPendingProductController`, already exists and is fixed/`save()`-complete, it's just not routed), and `GET /product/products` (a public listing distinct from the dashboard one). These read as intentionally-planned, not-yet-shipped endpoints rather than accidental gaps — wire them up (with the appropriate Zod schema + session/transaction + Redis invalidation, matching the conventions used everywhere else in this service) once the corresponding feature is ready.
- **A possible bug in the external `@beautinique/backend-zod` package's `tryOnConfiguration` schema.** Both `draftProductStepBodyZodSchema` and `draftProductDetailsZodSchema` define `tryOnConfiguration` as a discriminated union keyed on `enabled`, but per the package's own published type declarations, **both union branches currently declare `enabled: ZodLiteral<false>`** (the branch that requires a full, non-optional `tryOn` selection almost certainly should be `ZodLiteral<true>`). This lives in a separate repo/package (`BQ-Packages`), not this one, so it isn't something to fix here — but it's worth knowing about if try-on validation ever behaves unexpectedly at the API boundary, since it means Zod may not actually be able to distinguish the two `tryOnConfiguration` variants as designed. This is also part of why the Mongoose-level `tryOnSchema` validation (§5.2.2, §11.4) matters as a real second line of defense rather than a redundant belt-and-braces check — it's the layer that still enforces the category/sub-category relationship correctly regardless of what happens upstream in Zod.
- **Public vs. dashboard product lookup caching is asymmetric.** `GET /product/dashboard/:slug` is cache-aside over Redis; `GET /product/:slug` (the public storefront lookup, almost certainly the higher-traffic of the two) hits MongoDB directly on every request. Worth revisiting if storefront traffic grows.
- **A Mongo `E11000` duplicate-key error on `Product.slug`/`Product.sku`** (from `publishDraftProductController`'s `product.save({ session })`) is not currently caught and translated into a friendly `ConflictError` the way the category controllers do for their own duplicate-key races — a collision here (astronomically unlikely given both are timestamp/random-suffixed, but not impossible under concurrent publishes) would surface as a generic `InternalServerError` instead.
- **`RedisCacheCategory`/`RedisCacheDashboard` degrade gracefully, never crash.** Every Redis operation swallows its own errors and logs a warning (`RedisCacheHelper`); a Redis outage falls through to MongoDB on every cache-aside read path.
- **Category cache writes/deletes are deferred to `res.locals.afterCommit`.** This keeps the Redis cache from ever getting ahead of a transaction that later rolls back. The categories hash also carries a 1-day TTL (set only when the hash doesn't already exist, so it isn't perpetually renewed by routine writes) specifically so that a rare failed Redis delete self-heals via a full MongoDB reseed instead of leaving a stale entry indefinitely.
- **`findOrCreateCategory` (`services/index.ts`) is currently unused** by any controller in this service — it's an upsert helper available for future seed scripts or cross-service use, not part of the live request path today.
- **`productCount` on a category is never written to** by any controller in this service — the field exists on the schema and is read by `deleteCategoryController`'s L3 product-count guard, but nothing here increments/decrements it (presumably maintained by whichever controller actually creates/deletes/re-categorizes a product — worth confirming `publishDraftProductController`/a future product-deletion flow actually does this, since a permanently-stale `productCount` would make the delete-guard in §9.3 unreliable in either direction).
- **`authenticate` is exported but unused directly** — every route that needs identity uses `authorize(allowedRoles)` instead, since role-gating is required everywhere identity is.
- **`GET /` regenerates on `npm run build`, not `npm run dev`.** `public/index.html` is generated from `README.md` by the `postbuild` script. Editing this file while running `npm run dev` won't update `GET /` until a build actually runs.
