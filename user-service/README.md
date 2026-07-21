# User Service — Documentation

**Project:** Beautinique (BQ-Microservices)
**Service:** User Service
**Author:** Nageshwar Pawar
**Version:** 1.0.0
**Port:** configured via `PORT` (see [§4](#4-environment-variables))

---

## 1. Overview

The User Service is the central identity and authentication microservice for the **Beautinique** platform. It handles manual (email/phone + password) and OAuth (Google, LinkedIn, GitHub) login, OTP-verified registration, forgot/change/set password flows, session lookup, and a Redis-backed cache for user sessions and OTP state. Password reset/registration OTPs are delivered by enqueuing `send-otp` jobs onto BullMQ's `mail-queue`, consumed end-to-end by `mail-service`. It also serves its own documentation: `GET /` renders this README as HTML, and `GET /docs` serves an interactive Swagger UI.

---

## 2. Technology Stack

| Layer                    | Technology                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                  | Node.js (ES2025, ESM)                                                                                                           |
| Language                 | TypeScript 6.x (`strict`, `noUncheckedIndexedAccess`, `noEmitOnError`)                                                          |
| Framework                | Express.js 5.x                                                                                                                  |
| Database                 | MongoDB (via Mongoose 9.x, `@beautinique/backend-mongoose`)                                                                     |
| Cache                    | Redis, via the `redis` client (custom `RedisCacheManager`, not a shared package)                                                |
| Background jobs / queue  | BullMQ (Redis), via `@beautinique/backend-bullmq` — **producer only** (see [§16](#16-background-jobs-mail-queue-producer-only)) |
| OAuth                    | `google-auth-library` (Google), hand-rolled REST calls via `axios` (LinkedIn, GitHub)                                           |
| Password hashing         | `bcryptjs`                                                                                                                      |
| Validation               | Zod, via `@beautinique/backend-zod`                                                                                             |
| Logging                  | Pino, via `@beautinique/backend-logger`                                                                                         |
| API docs                 | OpenAPI 3.0 spec (hand-written) + `swagger-ui-express`                                                                          |
| README rendering         | `@beautinique/shared-markdown-to-html` (markdown → HTML)                                                                        |
| Shared response envelope | `@beautinique/backend-response`                                                                                                 |
| Shared utilities         | `@beautinique/backend-utils`, `@beautinique/backend-mongoose`, `@beautinique/shared-utils`                                      |
| Shared constants/types   | `@beautinique/shared-constants`, `@beautinique/backend-types`                                                                   |
| Code quality             | ESLint (flat config, type-checked + strict), Prettier                                                                           |

---

## 3. Project Structure

```
user-service/
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
│   │   ├── apis/
│   │   │   ├── index.ts               #   Re-exports
│   │   │   ├── ApiRequest.ts          #   Axios base class; wraps failures as backend-classes AppError subclasses
│   │   │   └── socialAuth/
│   │   │       ├── index.ts           #   Re-exports
│   │   │       ├── Google.ts          #   Google OAuth2Client wrapper
│   │   │       ├── Linkedin.ts        #   LinkedIn OAuth (hand-rolled REST calls)
│   │   │       └── Github.ts          #   GitHub OAuth (hand-rolled REST calls)
│   │   └── redis/
│   │       ├── index.ts               #   RedisCacheManager - owns the client, connect()/close(), .user/.token
│   │       ├── RedisCacheHelper.ts    #   Base class: string/hash get/set/delete primitives
│   │       ├── RedisCacheUser.ts      #   User cache (cache-aside over MongoDB)
│   │       └── RedisCacheToken.ts     #   OTP session cache
│   ├── configs/
│   │   └── index.ts                   #   Singletons: databaseConfigs, logger, jobProducer, redisClient, redisCacheManager, google, linkedin, github
│   ├── constants/
│   │   └── index.ts                   #   LOGGER_BASE_OPTIONS, route paths, OAuth provider API routes
│   ├── controllers/
│   │   ├── index.ts                   #   Re-exports all controllers
│   │   ├── user.controller.ts         #   Session / get current user
│   │   ├── login.controller.ts        #   Manual + OAuth login flows
│   │   ├── register.controller.ts     #   OTP-based registration flow
│   │   ├── password.controller.ts     #   Forgot/change/set password flows
│   │   └── logout.controller.ts       #   Logout handler
│   ├── docs/
│   │   └── openapi.ts                 #   Hand-written OpenAPI 3.0 spec, served at /docs
│   ├── envs/
│   │   └── index.ts                   #   process.env → typed envs, fail-fast on missing/invalid vars
│   ├── middlewares/
│   │   └── index.ts                   #   authenticate, authorize
│   ├── models/
│   │   └── index.ts                   #   User, Seller, Wishlist (Mongoose)
│   ├── routes/
│   │   ├── index.ts                   #   Root router (/api/v1)
│   │   ├── auth/
│   │   │   ├── index.ts               #   Auth group router
│   │   │   ├── login.route.ts         #   Login + OAuth routes
│   │   │   ├── register.route.ts      #   Registration + OTP routes
│   │   │   └── password.route.ts      #   Password management routes
│   │   └── user/
│   │       └── index.ts               #   User routes (session)
│   ├── schemas/                       # Mongoose schema definitions
│   │   ├── index.ts
│   │   ├── user.schema.ts
│   │   ├── seller.schema.ts
│   │   └── wishlist.schema.ts
│   ├── services/
│   │   └── index.ts                   #   User CRUD/query service functions
│   ├── types/
│   │   ├── index.ts                   #   Core interfaces (IUser, ISeller, etc.)
│   │   └── express.d.ts               #   Request.user augmentation
│   └── utils/
│       └── index.ts                   #   OAuth payload builder, minimal-user projector, OTP/token generators
├── scripts/
│   └── generate-html.mjs              # Renders README.md → public/index.html, runs via "postbuild"
├── public/
│   └── index.html                     # Pre-rendered README, served by GET /
├── dist/                              # Compiled JavaScript output (git-ignored)
├── logs/                              # error.log, warning.log, success.log, request.log
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
| ---------------- | ------------------------------------------------------------------------------------ |
| `PORT`           | HTTP port to listen on                                                               |
| `NODE_ENV`       | `"development"` enables pretty logging and stack traces in error responses           |
| `SERVICE_NAME`   | Name tag attached to every log line                                                  |
| `SERVICE_SECRET` | Shared secret required in the `X-Service-Secret` header on every `/api/v1/*` request |
| `DATABASE_NAME`  | MongoDB database name                                                                |

### 4.2 MongoDB

| Variable      | Description               |
| ------------- | ------------------------- |
| `MONGODB_URI` | MongoDB connection string |

### 4.3 Redis — Cache

| Variable         | Description                            |
| ---------------- | -------------------------------------- |
| `CACHE_HOST`     | Redis host used for the user/OTP cache |
| `CACHE_PORT`     | Redis port                             |
| `CACHE_PASSWORD` | Redis password                         |
| `CACHE_USERNAME` | Redis username                         |

### 4.4 Redis — BullMQ

| Variable           | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `BULL_MQ_HOST`     | Redis host used for the `mail-queue` BullMQ connection |
| `BULL_MQ_PORT`     | Redis port                                             |
| `BULL_MQ_PASSWORD` | Redis password                                         |
| `BULL_MQ_USERNAME` | Redis username                                         |

**This Redis instance is shared** with `mail-service`, which runs the `mail-queue` worker — it must point to the same instance in both services.

### 4.5 OAuth Credentials

| Variable                 | Description                  |
| ------------------------ | ---------------------------- |
| `GOOGLE_CLIENT_ID`       | Google OAuth Client ID       |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth Client Secret   |
| `LINKEDIN_CLIENT_ID`     | LinkedIn OAuth Client ID     |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth Client Secret |
| `GITHUB_CLIENT_ID`       | GitHub OAuth Client ID       |
| `GITHUB_CLIENT_SECRET`   | GitHub OAuth Client Secret   |

There's no `*_REDIRECT_ENDPOINT` env var per provider anymore — each provider's callback URL is now derived in code (`getSocialAuthRedirectURL`, see [§13](#13-utilities-utilsindexts)) from the service's own route paths instead of being configured separately, so it can't drift out of sync with the actual routes.

### 4.6 Gateway URL

| Variable           | Description                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- |
| `GATEWAY_BASE_URL` | Base URL prepended to the computed OAuth callback path, exposed as `envs.gateway_url` |

---

## 5. Database Models

### 5.1 User Schema (`user.schema.ts`)

Collection: `users`

| Field         | Type            | Required | Default      | Notes                                                                                   |
| ------------- | --------------- | -------- | ------------ | --------------------------------------------------------------------------------------- |
| `firstName`   | String          | Yes      | —            | Trimmed                                                                                 |
| `lastName`    | String          | Yes      | —            | Trimmed                                                                                 |
| `phoneNumber` | String          | No       | `""`         | Trimmed, partial unique index                                                           |
| `email`       | String          | Yes      | —            | Lowercased, trimmed                                                                     |
| `avatar`      | String          | No       | `""`         | Trimmed                                                                                 |
| `role`        | String (enum)   | No       | `"USER"`     | `USER`, `SELLER`, `ADMIN`, `MASTER` (`USER_ROLES` from `@beautinique/shared-constants`) |
| `password`    | String          | No       | `""`         | Bcrypt-hashed, `""` for OAuth-only accounts                                             |
| `providers`   | [String] (enum) | No       | `["MANUAL"]` | `MANUAL`, `GOOGLE`, `LINKEDIN`, `GITHUB` (`AUTH_PROVIDERS`)                             |
| `status`      | String (enum)   | No       | `"ACTIVE"`   | `ACTIVE`, `INACTIVE`, `DELETED` (service-local `USER_STATUS`)                           |
| `reason`      | String          | No       | —            | Deactivation / deletion note                                                            |

Also has `timestamps: true`, `versionKey: false`.

**Indexes:**
- `{ email: 1 }` unique
- `{ phoneNumber: 1 }` unique, partial (`$exists: true, $ne: ''`)
- `{ firstName: 1 }`, `{ lastName: 1 }`, `{ firstName: 1, lastName: 1 }` (search)
- `{ role: 1 }`, `{ status: 1 }` (filter)
- `{ status: 1, role: 1, createdAt: -1 }` (admin listing)

### 5.2 Seller Schema (`seller.schema.ts`)

Collection: `sellers`

| Field               | Type                | Required | Notes                                                                                                                                                                  |
| ------------------- | ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`              | ObjectId ref `User` | Yes      | Links to user account                                                                                                                                                  |
| `businessAddress`   | Object              | Yes      | `address`, `landmark`, `city`, `state` (enum `STATES_AND_UTS`), `pinCode` (6-digit), `country` (enum `COUNTRIES`, default `"India"`), `pan` (10-char), `gst` (15-char) |
| `personalDetails`   | Object              | Yes      | `name`, `email`, `phoneNumber`                                                                                                                                         |
| `businessDetails`   | Object              | Yes      | `name`, `email`, `phoneNumber`, `category` (enum `SELLER_TYPES`)                                                                                                       |
| `requiredDocuments` | Object              | Yes      | `gst`, `itr`, `geoTagging`, `addressProof` (URLs/paths)                                                                                                                |
| `approvalStatus`    | String (enum)       | —        | `PENDING`, `APPROVED`, `REJECTED` (default `"PENDING"`)                                                                                                                |
| `status`            | String (enum)       | —        | `ACTIVE`, `INACTIVE`, `DELETED` (default `"ACTIVE"`)                                                                                                                   |
| `reason`            | String              | —        | —                                                                                                                                                                      |

**Indexes:** `{ email: 1 }` unique (top-level field, despite email actually living under `personalDetails`/`businessDetails` — no top-level `email` field is defined), `{ phoneNumber: 1 }` unique (same caveat).

### 5.3 Wishlist Schema (`wishlist.schema.ts`)

Collection: `wishlists`

| Field      | Type                     | Required | Notes                       |
| ---------- | ------------------------ | -------- | --------------------------- |
| `user`     | ObjectId ref `User`      | Yes      | Unique per user             |
| `products` | [ObjectId ref `Product`] | No       | Array of product references |

**Indexes:** `{ user: 1 }` unique (one wishlist per user).

*Note: `Seller` and `Wishlist` models are defined but **no controllers/routes exist for them yet** in this service — they're available for other services (or a future admin surface) to use directly against the shared MongoDB.*

---

## 6. API Routes

All `/api/v1/*` routes require the `X-Service-Secret` header and a ready MongoDB connection (`checkServiceAccess` + `checkDbConnection`, both mounted in `app.ts`, scoped to `/api/v1`). `/`, `/docs`, and `/health` are intentionally outside that and reachable without either.

### 6.1 Home, Docs & Health

| Method | Path      | Auth | Description                                                      |
| ------ | --------- | ---- | ---------------------------------------------------------------- |
| GET    | `/`       | None | This README, pre-rendered to HTML by `scripts/generate-html.mjs` |
| GET    | `/docs`   | None | Interactive Swagger UI (spec in `src/docs/openapi.ts`)           |
| GET    | `/health` | None | Liveness + MongoDB connection status                             |

### 6.2 Login — `/api/v1/auth/login`

| Method | Path                                  | Auth | Description                         |
| ------ | ------------------------------------- | ---- | ----------------------------------- |
| POST   | `/auth/login/manual`                  | None | Manual email/phone + password login |
| GET    | `/auth/login/oauth/google/redirect`   | None | Get Google OAuth consent URL        |
| GET    | `/auth/login/oauth/google/callback`   | None | Google OAuth callback               |
| GET    | `/auth/login/oauth/linkedin/redirect` | None | Get LinkedIn OAuth consent URL      |
| GET    | `/auth/login/oauth/linkedin/callback` | None | LinkedIn OAuth callback             |
| GET    | `/auth/login/oauth/github/redirect`   | None | Get GitHub OAuth consent URL        |
| GET    | `/auth/login/oauth/github/callback`   | None | GitHub OAuth callback               |

### 6.3 Register — `/api/v1/auth/register`

| Method | Path                        | Auth | Description                                          |
| ------ | --------------------------- | ---- | ---------------------------------------------------- |
| POST   | `/auth/register/send-otp`   | None | Send OTP to email (start registration)               |
| PATCH  | `/auth/register/resend-otp` | None | Resend OTP (session token in `Authorization` header) |
| POST   | `/auth/register/verify-otp` | None | Verify OTP code                                      |
| POST   | `/auth/register/save-user`  | None | Complete registration (name, password, phone)        |

### 6.4 Password — `/api/v1/auth/password`

| Method | Path                               | Auth | Description                                                 |
| ------ | ---------------------------------- | ---- | ----------------------------------------------------------- |
| POST   | `/auth/password/forgot-send-otp`   | None | Send OTP for password reset                                 |
| PATCH  | `/auth/password/forgot-resend-otp` | None | Resend OTP for password reset                               |
| POST   | `/auth/password/forgot-verify-otp` | None | Verify OTP for password reset                               |
| POST   | `/auth/password/forgot-save`       | None | Save new password after OTP verify                          |
| PATCH  | `/auth/password/change`            | User | Change password while logged in (requires current password) |
| PATCH  | `/auth/password/set`               | User | Set an initial password for an OAuth-only account           |

### 6.5 Logout — `/api/v1/auth/logout`

| Method | Path           | Auth | Description                        |
| ------ | -------------- | ---- | ---------------------------------- |
| DELETE | `/auth/logout` | User | Remove the caller's cached session |

### 6.6 User — `/api/v1/user`

| Method | Path            | Auth | Description                                                 |
| ------ | --------------- | ---- | ----------------------------------------------------------- |
| GET    | `/user/session` | User | Fetch the caller's own user record (cache-aside over Mongo) |

"Auth: User" above means the controller itself requires `X-User-Id` (either via the `authenticate` middleware, or — for `GET /user/session` and `DELETE /auth/logout` — a direct header check in the controller/middleware; see [§11](#11-middlewares)).

---

## 7. Request Headers

| Header             | Purpose                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| `X-Service-Secret` | Service-to-service authentication (`checkServiceAccess`, required on `/api/v1/*`)       |
| `X-User-Id`        | End user's id (forwarded by the gateway/caller, required wherever "Auth: User" applies) |
| `X-User-Role`      | End user's role, defaults to `USER` if not sent (`authorize` middleware only)           |
| `X-Login-Role`     | Optional role check for `/auth/login/manual` (`MASTER` always allowed)                  |
| `Authorization`    | OTP session token (raw or `Bearer <token>`) for register/forgot-password steps          |

There's no JWT here — the gateway/upstream service is expected to have already authenticated the user and forwarded their identity via `X-User-Id`/`X-User-Role`.

---

## 8. Authentication Flow

### 8.1 Manual Login (`POST /auth/login/manual`)

1. Client sends `loginMethod` (`"email"` or `"phoneNumber"`) plus the matching `email`/`phoneNumber` and `password`.
2. Service looks up the user by email or phone (`getUserByEmailOrPhone`), throwing `NotFoundError` with field-specific errors if nothing matches.
3. Checks that the user has `MANUAL` in `providers` — otherwise `UnprocessableEntityError` naming the linked OAuth provider(s).
4. If `X-Login-Role` is sent, the user's role must match it (or be `MASTER`) — otherwise `AuthorizationError`.
5. Compares the `bcrypt` hash of the provided password — mismatch throws `ValidationError` with a `password` field error.
6. On success, returns the minimal user object and caches it in Redis (24h TTL).

### 8.2 OAuth Login (Google / LinkedIn / GitHub)

_Redirect flow:_
1. `GET /auth/login/oauth/{provider}/redirect` → returns the provider's OAuth consent URL.
2. Client redirects the user to that URL.
3. Provider redirects back to `GET /auth/login/oauth/{provider}/callback?code=...`.
4. Service exchanges the code for an access token and fetches the user's profile (throws `BadRequestError` if `code` is missing, `NotFoundError` if the profile has no email).
5. Looks up a user by that email:
   - **Exists, provider not yet linked** → pushes the provider onto `providers`, backfills `avatar` if empty.
   - **Exists, provider already linked** → returns the existing user as-is.
   - **Doesn't exist** → creates a new user with `providers: [PROVIDER]`.
6. Returns the minimal user object, cached in Redis.

### 8.3 Registration Flow

Four-step OTP-based registration:

| Step | Endpoint                          | Purpose                                      |
| ---- | --------------------------------- | -------------------------------------------- |
| 1    | `POST /auth/register/send-otp`    | Send OTP to email, returns a session `token` |
| 2    | `PATCH /auth/register/resend-otp` | Resend OTP (rate-limited)                    |
| 3    | `POST /auth/register/verify-otp`  | Verify the received OTP code                 |
| 4    | `POST /auth/register/save-user`   | Submit name/password/phone, creates the user |

- OTPs are stored in Redis with a **10-minute TTL** (`RedisCacheToken`).
- `sanitizeToken()` (from `@beautinique/backend-utils`) strips a `Bearer ` prefix and throws `UnprocessableEntityError('Token not found')` if the `Authorization` header is missing/empty — the controllers no longer do their own presence check.
- Resend is capped at `MAX_OTP_RESEND` (3, from `@beautinique/shared-constants`) — `sendCount` starts at 1 on the initial send and increments on every resend, so the **3rd resend call** (4th OTP send overall) throws `TooManyRequestsError` (the OTP/send-count is still rotated in Redis on the attempt that trips the limit, the email is just never enqueued).
- On successful registration, the user is created with `providers: ["MANUAL"]`, or — if an OAuth-only account already exists for that email — `MANUAL` is added to its `providers`.

### 8.4 Logout

- `DELETE /auth/logout` — requires `authenticate` (reads `X-User-Id`), deletes the user's cached session from Redis. No-op (still returns success) if nothing was cached.

---

## 9. Password Management

### 9.1 Forgot Password Flow

| Step | Endpoint                                 | Purpose               |
| ---- | ---------------------------------------- | --------------------- |
| 1    | `POST /auth/password/forgot-send-otp`    | Send OTP to email     |
| 2    | `PATCH /auth/password/forgot-resend-otp` | Resend OTP            |
| 3    | `POST /auth/password/forgot-verify-otp`  | Verify OTP            |
| 4    | `POST /auth/password/forgot-save`        | Save the new password |

- Step 1 throws `UnprocessableEntityError` if a user exists for that email but has no `MANUAL` provider.
- Same `MAX_OTP_RESEND`/10-minute-TTL rules as registration.
- New password cannot equal the current one (`UnprocessableEntityError`).
- After reset, the Redis user cache is refreshed.

### 9.2 Change Password (`PATCH /auth/password/change`)

- Requires `authenticate`.
- Requires `currentPassword` (checked against the bcrypt hash — mismatch throws `ValidationError` with a field error) + a new `password`.
- New and current passwords cannot be identical (`UnprocessableEntityError` with a field error).

### 9.3 Set Password (`PATCH /auth/password/set`)

- Requires `authenticate`.
- For users who signed up via OAuth only (no password set yet).
- Throws `UnprocessableEntityError` if `MANUAL` is already linked — use forgot-password instead.

---

## 10. Redis Cache (`classes/redis/`)

A `RedisCacheManager` singleton (instantiated once in `configs/index.ts`, exported as `redisCacheManager`) wraps a single `redis` client and exposes two sub-caches, `.user` (`RedisCacheUser`) and `.token` (`RedisCacheToken`), both extending the shared `RedisCacheHelper` base class.

### Key Prefixes

| Prefix                           | Purpose           |
| -------------------------------- | ----------------- |
| `bq:user-service:users:<id>`     | User session data |
| `bq:user-service:tokens:<token>` | OTP session data  |

### `RedisCacheManager` (`classes/redis/index.ts`)

| Method      | Description                                                                     |
| ----------- | ------------------------------------------------------------------------------- |
| `connect()` | Connects the underlying client; failures are logged, not thrown (never rejects) |
| `close()`   | Gracefully closes the connection (`client.quit()`)                              |
| `.user`     | `RedisCacheUser` instance                                                       |
| `.token`    | `RedisCacheToken` instance                                                      |

An internal `isReady` flag, updated by the client's `connect`/`error`/`reconnecting`/`end` events, gates every cache operation — see [`getClient()`](#redis-fallback-behavior) below.

### `RedisCacheUser` (`classes/redis/RedisCacheUser.ts`)

| Method               | Description                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `setUser(user)`      | Cache user data (TTL: 24 hours)                                                                   |
| `getUser(userId)`    | Cache-aside: Redis first, falls back to MongoDB (`getUserById`) and repopulates the cache on miss |
| `updateUser(user)`   | Alias for `setUser` — used after a mutation                                                       |
| `deleteUser(userId)` | Remove a user from the cache                                                                      |

### `RedisCacheToken` (`classes/redis/RedisCacheToken.ts`)

| Method                 | Description                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `setOtpData(email)`    | Generates a 6-digit OTP + a 20-byte hex token, stores `{ otp, email, sendCount: 1 }` (10 min TTL), returns `{ token, otp, email, sendCount }` |
| `getOtpData(token)`    | Retrieve the OTP session by token                                                                                                             |
| `updateOtpData(token)` | Regenerates the OTP, increments `sendCount`, re-stores (10 min TTL); throws `ValidationError` if the session doesn't exist                    |
| `deleteOtpData(token)` | Remove the OTP session                                                                                                                        |

### `RedisCacheHelper` (`classes/redis/RedisCacheHelper.ts`)

Shared low-level primitives both sub-caches build on: `setData`/`getData`/`deleteData` (string), `setHashData`/`getHashField`/`getAllHashFields`/`deleteHashField`/`deleteHashData` (hash), `exists`/`hasHashField`. Every method resolves to a safe default (`null`, `false`, `{}`, or simply returns) and logs a warning instead of throwing on a Redis-level failure — a Redis outage degrades the service, it doesn't crash it.

### Redis Fallback Behavior

`RedisCacheManager` passes each sub-cache a `getClient()` closure that returns `null` whenever `isReady` is false (client not connected / mid-reconnect). `RedisCacheHelper`'s methods check this before every operation — `getUser()` falling through to MongoDB on a Redis outage is exactly this mechanism at work, not special-cased logic in `RedisCacheUser`.

### Reconnection Strategy (`configs/index.ts`)

The `redisClient` (used by `RedisCacheManager`) is configured with a `reconnectStrategy`: exponential-ish backoff of `min(retries * 1000ms, 10s)`, giving up after 5 retries.

---

## 11. Middlewares

### `authenticate` (`middlewares/index.ts`)

Reads `X-User-Id` (throws `AuthenticationError` if missing), fetches the user via `redisCacheManager.user.getUser`, attaches it to `req.user`. Mounted in front of `/auth/logout`, `/auth/password/change`, and `/auth/password/set`.

### `authorize(allowedRoles)` (`middlewares/index.ts`)

Factory middleware — same header extraction as `authenticate`, plus reads `X-User-Role` (defaults to `USER`) and throws `AuthorizationError` if the role isn't in `allowedRoles` or doesn't match the header. Exported but **not currently wired into any route**.

*Note: `GET /user/session` does its own `X-User-Id` check directly in `getSessionUserController` rather than going through `authenticate` — same effect, different call site.*

### External Middlewares (from `@beautinique/*` packages)

| Middleware           | Package                         | Purpose                                                                       |
| -------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `checkServiceAccess` | `@beautinique/backend-request`  | Validates `X-Service-Secret`, timing-safe compare                             |
| `checkDbConnection`  | `@beautinique/backend-mongoose` | Rejects with 503 if MongoDB isn't ready (scoped to `/api/v1` only)            |
| `checkEmptyRequest`  | `@beautinique/backend-request`  | Guards against empty request bodies/query before validation                   |
| `validateZod`        | `@beautinique/backend-zod`      | Request body validation via Zod (`loginZodSchema`, `registerZodSchema`, etc.) |
| `tryCatchResponse`   | `@beautinique/backend-response` | Wraps controllers in try/catch, forwards errors to `errorResponse`            |
| `successResponse`    | `@beautinique/backend-response` | Attaches `res.success({ statusCode, message, data })`                         |
| `notFoundResponse`   | `@beautinique/backend-response` | 404 handler (branded HTML page for browser requests)                          |
| `errorResponse`      | `@beautinique/backend-response` | Central error handler                                                         |
| `createHttpLogger`   | `@beautinique/backend-logger`   | Per-request Pino logging                                                      |

---

## 12. Services Layer (`services/index.ts`)

| Function                      | Description                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `getUserById(data)`           | Find user by ObjectId; `password`/`lean` options; throws `NotFoundError`                   |
| `getUserByEmail(data)`        | Find user by email (no throw on miss — callers decide)                                     |
| `getUserByPhoneNumber(data)`  | Find user by phone number (no throw on miss)                                               |
| `getUserByEmailOrPhone(data)` | Find user by email **or** phone; throws `NotFoundError` with field-specific errors on miss |
| `createNewUser(payload)`      | Create a new user document                                                                 |
| `updateUser(filter, payload)` | Update via `findOneAndUpdate`; throws `NotFoundError` if nothing matched                   |

---

## 13. Utilities (`utils/index.ts`)

| Function                               | Description                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createOAuthDbPayload(data, provider)` | Builds a new-user payload from a third-party OAuth profile                                                                                                                       |
| `getMinimalUser(user)`                 | Returns the sanitized client-facing user shape (`_id` as string; excludes `password`/`reason`/timestamps)                                                                        |
| `generateOtp()`                        | Returns a random 6-digit numeric OTP                                                                                                                                             |
| `generateTempToken(bytes = 32)`        | Returns a hex token (default 32 bytes = 64 hex chars)                                                                                                                            |
| `getSocialAuthRedirectURL(provider)`   | Builds the absolute OAuth callback URL: `envs.gateway_url` + `/api/v1/{SERVICE_NAMES_MAP['user-service']}/auth/login` + that provider's `callback.path` from `METHODS_AND_PATHS` |

`getSocialAuthRedirectURL` no longer reads a per-provider `*_REDIRECT_ENDPOINT` env var — it derives the callback path directly from this service's own `METHODS_AND_PATHS` route constants (`constants/index.ts`) and `SERVICE_NAMES_MAP['user-service']` (`@beautinique/shared-constants`), so the URL registered with each OAuth provider can never drift out of sync with the actual route. Each `socialAuth/*.ts` class now calls this once at construction and caches it in a `REDIRECT_URI` field, rather than recomputing it on every `url()`/`access_token()` call.

`getObjId`/`toObjectId` moved out of this service — `getObjId` is now imported directly from `@beautinique/backend-mongoose` where needed (`services/index.ts`, `password.controller.ts`).

---

## 14. OAuth Integrations (`classes/apis/socialAuth/`)

### Google (`Google.ts`)

- Uses `google-auth-library`'s `OAuth2Client` directly (not the full `googleapis` SDK — swapped out to cut install size/type-check cost; only `OAuth2Client` was ever used).
- `url()` generates the consent URL with `scope: [profile, email]`.
- `decode(code)` exchanges the code for tokens, fetches the profile from `https://www.googleapis.com/oauth2/v2/userinfo`.

### LinkedIn (`Linkedin.ts`)

- Directly constructs the authorization URL (no SDK).
- `access_token(code)` POSTs to `https://www.linkedin.com/oauth/v2/accessToken`.
- `decode(access_token)` GETs `https://api.linkedin.com/v2/userinfo`.

### GitHub (`Github.ts`)

- Directly constructs the authorization URL.
- `access_token(code)` POSTs to `https://github.com/login/oauth/access_token`.
- `decode(access_token)` fetches the profile from `https://api.github.com/user`; falls back to `/user/emails` (picks the `primary` one, else the first) if the profile has no public email.

All three extend `ApiRequest` (`classes/apis/ApiRequest.ts`), which wraps every request in a common `try/catch`: an `AxiosError` with a response is turned into the matching `@beautinique/backend-classes` error subclass via `createError`/`ERROR_CLASS_MAP` (falling back to `INTERNAL_SERVER_ERROR` for an unrecognized/missing error code), anything else becomes a generic `INTERNAL_SERVER_ERROR`.

---

## 15. External OAuth Routes (for reference)

Defined in `constants/index.ts` as `OAUTH_API_ROUTES_AND_METHODS`:

| Provider | Method | URL                                             | Purpose                             |
| -------- | ------ | ----------------------------------------------- | ----------------------------------- |
| Google   | GET    | `https://www.googleapis.com/oauth2/v2/userinfo` | Decode Google profile               |
| LinkedIn | POST   | `https://www.linkedin.com/oauth/v2/accessToken` | Get LinkedIn access token           |
| LinkedIn | GET    | `https://api.linkedin.com/v2/userinfo`          | Decode LinkedIn profile             |
| GitHub   | POST   | `https://github.com/login/oauth/access_token`   | Get GitHub access token             |
| GitHub   | GET    | `https://api.github.com/user`                   | Decode GitHub profile               |
| GitHub   | GET    | `https://api.github.com/user/emails`            | Fetch GitHub user emails (fallback) |

---

## 16. Background Jobs (`mail-queue`, producer only)

This service **only produces** onto `mail-queue` — it doesn't run a worker for anything. `jobProducer` (`@beautinique/backend-bullmq`'s `JobProducer`, configured in `configs/index.ts`) is used directly from the register/password controllers.

| Job name   | Enqueued from                                                                                                                      | Consumed by                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `send-otp` | `registerSendOtpController`, `registerResendOtpController`, `forgotPasswordSendOtpController`, `forgotPasswordResendOtpController` | `mail-service` (`WorkerManager`) |

**Rollback on enqueue failure:** every `jobProducer.addJob('mail-queue', 'send-otp', ...)` call is wrapped in its own `try/catch` — if enqueueing fails, the just-written OTP session is deleted from Redis (`redisCacheManager.token.deleteOtpData`) before the error is re-thrown, so a failed send doesn't leave an unreachable OTP session behind.

**Retry/backoff:** configured once, at the `jobProducer` level (`configs/index.ts`): `attempts: 3`, `backoff: { type: 'exponential', delay: 2000 }`, `removeOnComplete: { age: 30, count: 5 }`, `removeOnFail: { age: 1800, count: 10 }`.

The `BULL_MQ_*` env vars must point to the **same** Redis instance as `mail-service`'s BullMQ connection, or enqueued jobs will never be picked up.

---

## 17. Error Handling

All errors are thrown as `AppError` subclasses from `@beautinique/backend-classes` (e.g. `NotFoundError`, `ValidationError`, `ConflictError`) — **not** the older `@beautinique/be-classes` package, which this service no longer depends on. Standard error codes used across the service:

| Code                    | HTTP Equivalent | When Used                                                                                                    |
| ----------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `BAD_REQUEST`           | 400             | Missing `code` query param on an OAuth callback                                                              |
| `VALIDATION_ERROR`      | 422             | Wrong password, invalid/expired OTP                                                                          |
| `NOT_FOUND`             | 404             | User not found, OAuth profile has no email                                                                   |
| `CONFLICT`              | 409             | Email/phone already exists                                                                                   |
| `UNPROCESSABLE_ENTITY`  | 422             | Password same as current; missing/empty OTP-session token (`sanitizeToken`); OAuth/manual provider conflicts |
| `AUTHENTICATION_ERROR`  | 401             | Missing `X-User-Id`                                                                                          |
| `AUTHORIZATION_ERROR`   | 403             | Login-role mismatch; insufficient role (`authorize`, currently unused)                                       |
| `TOO_MANY_REQUESTS`     | 429             | Max OTP resend attempts exceeded                                                                             |
| `INTERNAL_SERVER_ERROR` | 500             | Unexpected failures; unrecognized error code from an OAuth provider's API                                    |

Errors flow through the `errorResponse` middleware (`@beautinique/backend-response`), which only forwards `message`/`code`/`statusCode`/`fieldErrors`/`globalErrors` for **operational** `AppError`s — anything else (including a non-operational `AppError`) is converted to a generic `InternalServerError` before the client ever sees it, and `envs.is_dev` controls whether a stack trace is attached.

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

---

## 19. Build & Run Commands

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

## 20. Shared Packages (`@beautinique/*`)

| Package                                | Purpose                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@beautinique/backend-bullmq`          | `JobProducer` — typed BullMQ wrapper                                                                                                      |
| `@beautinique/backend-classes`         | `AppError` subclasses (`NotFoundError`, `ValidationError`, ...), `createError`, `ERROR_CLASS_MAP`                                         |
| `@beautinique/backend-logger`          | `createLogger`/`createHttpLogger` (Pino-based)                                                                                            |
| `@beautinique/backend-mongoose`        | `connectDb`, `disconnectDB`, `checkDbConnection`, `getConnectionHealth`, `getObjId`, `mongoEvents`                                        |
| `@beautinique/backend-request`         | `checkServiceAccess`, `checkEmptyRequest`                                                                                                 |
| `@beautinique/backend-response`        | `successResponse`/`errorResponse`/`notFoundResponse`/`tryCatchResponse`                                                                   |
| `@beautinique/backend-utils`           | `getUser`, `sanitizeToken`                                                                                                                |
| `@beautinique/backend-zod`             | `validateZod` and every request Zod schema (`loginZodSchema`, `registerZodSchema`, `otpZodSchema`, ...)                                   |
| `@beautinique/shared-constants`        | `USER_ROLES`, `AUTH_PROVIDERS`, `HEADERS_MAP`, `MAX_OTP_RESEND`, `SERVICE_NAMES_MAP`, `STATES_AND_UTS`, `COUNTRIES`, `SELLER_TYPES`, etc. |
| `@beautinique/shared-markdown-to-html` | `generateHtmlFromMarkdown` — used by `scripts/generate-html.mjs`                                                                          |
| `@beautinique/shared-utils`            | `requireEnv`/`requirePort`, `stringifyData`/`parseData`                                                                                   |
| `@beautinique/backend-types`           | `TAuthProvider`, `TUserRole`, `TLoginZodSchema`, and other Zod-inferred/shared types                                                      |

This service no longer depends on `@beautinique/be-classes`, `be-configs`, `be-constants`, `be-jobs`, `be-middlewares`, `be-utils`, or `be-zod` — all fully migrated to their `backend-*`/`shared-*` replacements.

---

## 21. API Response Format

All responses use `@beautinique/backend-response`'s envelope, attached via `app.use(successResponse({ defaultMessage: 'Success.' }))`:

```jsonc
// success
{ "success": true, "message": "User logged in successfully", "data": { "_id": "...", "firstName": "...", "...": "..." } }

// error
{ "success": false, "code": "VALIDATION_ERROR", "message": "...", "fieldErrors": { ... }, "globalErrors": [ ... ] }
```

`res.success({ statusCode, message, data })` — `data` is omitted entirely (not sent as `null`) when not provided; `statusCode` defaults to `200`.

---

## 22. Data Flow Examples

### Registration

```
Client → POST /auth/register/send-otp { email }
  → GET user by email from DB
  → Store OTP in Redis (10 min TTL) ← Returns { token, otp, sendCount: 1 }
  → jobProducer.addJob('mail-queue', 'send-otp', { email, otp })
  ← res.success({ data: token })

Client → POST /auth/register/verify-otp { otp } [Authorization: token]
  → Validate OTP in Redis

Client → POST /auth/register/save-user { firstName, lastName, password, phoneNumber } [Authorization: token]
  → Validate OTP session in Redis
  → Check for email/phone conflicts in DB
  → bcrypt.hash(password)
  → create user in MongoDB with providers: ["MANUAL"]
  → Delete OTP session from Redis
  → Set user in Redis cache (24h TTL)
  ← res.success({ data: minimalUser })
```

### Forgot Password

```
Client → POST /auth/password/forgot-send-otp { email }
  → Validate user has a MANUAL provider
  → Store OTP in Redis ← Returns { token, otp }
  → jobProducer.addJob('mail-queue', 'send-otp', { email, otp })

Client → POST /auth/password/forgot-verify-otp { otp } [Authorization: token]
  → Validate OTP in Redis

Client → POST /auth/password/forgot-save { password } [Authorization: token]
  → bcrypt.hash(new password)
  → Update password in MongoDB
  → Delete OTP session from Redis
  → Update user in Redis cache
  ← res.success({ data: minimalUser })
```

### OAuth Login

```
Client → GET /auth/login/oauth/{provider}/redirect
  ← Returns provider consent URL

User authenticates on the provider's site
Provider redirects → GET /auth/login/oauth/{provider}/callback?code=...

Service:
  → Exchange code for access_token
  → Fetch user profile from the provider's API
  → Find user by email in MongoDB
  → IF exists + provider not linked: link provider, backfill avatar
  → IF doesn't exist: create new user with that provider
  → Set user in Redis cache
  ← res.success({ data: minimalUser })
```

---

## 23. Key Relationships

```
User ──1→1─── Seller          (one seller profile per user)
User ──1→1─── Wishlist        (one wishlist per user)
Wishlist ──1→N─── Product     (many products per wishlist)
```

- `Seller.user`      → ref `User`
- `Wishlist.user`    → ref `User`
- `Wishlist.products`→ ref `Product` (external, owned by `product-service`)

---

## 24. Design Notes / Known Trade-offs

- **`authorize` middleware is exported but unused.** No route currently requires role-based restriction beyond `authenticate`'s "is logged in" check.
- **`RedisCacheUser.updateUser` is a plain alias for `setUser`.** Kept as a separate method for call-site clarity (an explicit "I'm updating an existing entry" vs "I'm setting one for the first time"), not because the implementation differs.
- **`Seller`/`Wishlist` have no controllers yet.** The Mongoose models and indexes exist so other services (or a future admin surface) can query them directly, but nothing in this service writes to them.
- **OAuth callback URLs are self-derived, not configured.** `getSocialAuthRedirectURL` builds each provider's callback URL from this service's own `METHODS_AND_PATHS` + `SERVICE_NAMES_MAP['user-service']` instead of a per-provider env var — the trade-off is that the URL registered with Google/LinkedIn/GitHub's OAuth console must match `{GATEWAY_URL}/api/v1/user-service/auth/login/oauth/{provider}/callback` exactly, and changing the route path in `constants/index.ts` now silently changes that URL too (previously it was two independent things that had to be kept in sync manually).
- **`GET /` regenerates on `npm run build`, not `npm run dev`.** `public/index.html` is generated from `README.md` by the `postbuild` script. Editing this file while running `npm run dev` won't update `GET /` until a build actually runs.
