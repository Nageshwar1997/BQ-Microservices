# User Service — Documentation

**Project:** Beautinique (BQ-Microservices)
**Service:** User Service
**Author:** Nageshwar Pawar
**Version:** 1.0.0
**Port:** 8081

---

## 1. Overview

The User Service is the central identity and authentication microservice for the **Beautinique** platform. It manages user accounts, authentication (manual + OAuth via Google, LinkedIn, GitHub), registration with OTP verification, password management (forgot/change/set), session management, seller profile tracking, wishlist management, and Redis caching for performance.

---

## 2. Technology Stack

| Layer             | Technology                                  |
|-------------------|---------------------------------------------|
| Runtime           | Node.js (ES2025, CommonJS)                  |
| Language          | TypeScript 6.x                              |
| Framework         | Express.js 5.x                             |
| Database          | MongoDB (via Mongoose 9.x)                  |
| Cache             | Redis 5.x                                   |
| Queue             | BullMQ (via `@beautinique/be-jobs`)         |
| Auth (OAuth)      | Google Auth Library, Axios for REST APIs    |
| Password Hashing  | bcryptjs                                    |
| Validation        | Zod (via `@beautinique/be-zod`)             |
| Shared Utilities  | `@beautinique/be-*` packages                |
| Code Quality      | ESLint, Prettier                            |

---

## 3. Project Structure

```
user-service/
├── src/
│   ├── index.ts                          # App entry point, server bootstrap, graceful shutdown
│   ├── configs/                          # App-level configurations (DB, logging)
│   │   └── index.ts
│   ├── constants/                        # Shared constants, route/path definitions
│   │   └── index.ts
│   ├── controllers/                      # Route handler logic
│   │   ├── index.ts                      #   Re-exports all controllers
│   │   ├── user.controller.ts            #   Session / get current user
│   │   ├── login.controller.ts           #   Manual + OAuth login flows
│   │   ├── register.controller.ts        #   OTP-based registration flow
│   │   ├── password.controller.ts        #   Forgot/change/set password flows
│   │   └── logout.controller.ts          #   Logout handler
│   ├── classes/                          # Reusable service classes
│   │   ├── index.ts                      #   Re-exports
│   │   ├──apis/
│   │   │   ├── index.ts                  #   Re-exports
│   │   │   ├── ApiRequest.ts             #   Axios base class with AppError wrapping
│   │   │   └── SocialAuth.ts             #   Google, LinkedIn, GitHub OAuth wrappers
│   │   └── RedisCache.ts                 #   Redis singleton cache for users & OTPs
│   ├── middlewares/                      # Express middlewares
│   │   └── index.ts                      #   authenticate, authorize
│   ├── models/                           # Mongoose models
│   │   └── index.ts                      #   User, Seller, Wishlist
│   ├── routes/                           # Express route definitions
│   │   ├── index.ts                      #   Root router (/api/v1)
│   │   ├── auth/
│   │   │   ├── index.ts                  #   Auth group router
│   │   │   ├── login.route.ts            #   Login + OAuth routes
│   │   │   ├── register.route.ts         #   Registration + OTP routes
│   │   │   └── password.route.ts         #   Password management routes
│   │   └── user/
│   │       └── index.ts                  #   User routes (session)
│   ├── schemas/                          # Mongoose schema definitions
│   │   ├── index.ts
│   │   ├── user.schema.ts
│   │   ├── seller.schema.ts
│   │   └── wishlist.schema.ts
│   ├── services/                         # Data/service layer
│   │   └── index.ts                      #   CRUD service functions
│   ├── types/                            # TypeScript type declarations
│   │   ├── index.ts                      #   Core interfaces (IUser, ISeller, etc.)
│   │   └── express.d.ts                  #   Express augmentation
│   └── utils/                            # Utility functions
│       └── index.ts
├── dist/                                 # Compiled JavaScript output
├── envs/                                 # Environment variable loader
├── logs/                                 # Application logs
│   ├── error.log
│   ├── success.log
│   ├── warnings.log
│   └── requests.log
├── package.json
├── tsconfig.json
├── .env
├── .prettierrc
└── eslint.config.mjs
```

---

## 4. Environment Variables

All environment variables are loaded via `dotenv` and normalized in `src/envs/index.ts`.

### 4.1 Server & App

| Variable           | Type    | Description                              |
|--------------------|---------|------------------------------------------|
| `PORT`             | Number  | Server port (default: **8081**)          |
| `IS_DEV`           | String  | `"true"` enables dev mode                |
| `SERVICE_NAME`     | String  | Display name of the service              |
| `SERVICE_SECRET`   | String  | Service-to-service authentication token  |
| `DATABASE_NAME`    | String  | MongoDB database name                    |

### 4.2 MongoDB

| Variable             | Description                              |
|----------------------|------------------------------------------|
| `MONGODB_URI`    | MongoDB connection string          |

### 4.3 Redis — Cache

| Variable                 | Description                |
|--------------------------|----------------------------|
| `CACHE_REDIS_HOST`       | Redis host for caching     |
| `CACHE_REDIS_PORT`       | Redis port for caching     |
| `CACHE_REDIS_PASSWORD`   | Redis password             |
| `CACHE_REDIS_USERNAME`   | Redis username             |

### 4.4 Redis — Job Queue (BullMQ)

| Variable                 | Description               |
|--------------------------|---------------------------|
| `JOB_REDIS_HOST`         | Redis host for job queues |
| `JOB_REDIS_PORT`         | Redis port for job queues |
| `JOB_REDIS_PASSWORD`     | Redis password            |
| `JOB_REDIS_USERNAME`     | Redis username            |

### 4.5 OAuth Credentials

| Variable                     | Description                   |
|------------------------------|-------------------------------|
| `GOOGLE_CLIENT_ID`           | Google OAuth Client ID        |
| `GOOGLE_CLIENT_SECRET`       | Google OAuth Client Secret    |
| `GOOGLE_REDIRECT_ENDPOINT`   | Google OAuth callback path    |
| `LINKEDIN_CLIENT_ID`         | LinkedIn OAuth Client ID      |
| `LINKEDIN_CLIENT_SECRET`     | LinkedIn OAuth Client Secret  |
| `LINKEDIN_REDIRECT_ENDPOINT` | LinkedIn OAuth callback path  |
| `GITHUB_CLIENT_ID`           | GitHub OAuth Client ID        |
| `GITHUB_CLIENT_SECRET`       | GitHub OAuth Client Secret    |
| `GITHUB_REDIRECT_ENDPOINT`   | GitHub OAuth callback path    |

### 4.6 External Service URLs

| Variable                     | Dev URL                          | Prod URL                            |
|------------------------------|----------------------------------|--------------------------------------|
| `GATEWAY_DEV_URL`            | `http://localhost:8080`          | `https://beautinique-gateway.onrender.com` |
| `USER_SERVICE_DEV_URL`       | `http://localhost:8081`          | `https://beautinique-user-service.onrender.com` |
| `MAIL_SERVICE_DEV_URL`       | `http://localhost:8083`          | `https://beautinique-mail-service.onrender.com` |
| `MEDIA_SERVICE_DEV_URL`      | `http://localhost:8084`          | `https://beautinique-media-service.onrender.com` |

---

## 5. Database Models

### 5.1 User Schema (`user.schema.ts`)

Collection: `users`

| Field           | Type             | Required | Default               | Notes                        |
|-----------------|------------------|----------|-----------------------|------------------------------|
| `firstName`     | String           | Yes      | —                     | Trimmed                      |
| `lastName`      | String           | Yes      | —                     | Trimmed                      |
| `phoneNumber`   | String           | No       | `""`                  | Trimmed, partial unique index|
| `email`         | String           | Yes      | —                     | Lowercased, unique index      |
| `avatar`        | String           | No       | `""`                  | Trimmed                      |
| `role`          | String (enum)    | No       | `"USER"`              | Values: `USER`, `MASTER`, `ADMIN` (from `@beautinique/be-constants`) |
| `password`      | String           | No       | `""`                  | Bcrypt-hashed                |
| `providers`     | [String] (enum)  | No       | `["MANUAL"]`          | Auth provider(s)              |
| `status`        | String (enum)    | No       | `"ACTIVE"`            | Values: `ACTIVE`, `INACTIVE`, `DELETED` |
| `reason`        | String           | No       | —                     | Deactivation / deletion note  |

**Indexes:**
- `{ email: 1 }` unique
- `{ phoneNumber: 1 }` unique (partial, non-empty)
- `{ firstName: 1 }`
- `{ lastName: 1 }`
- `{ firstName: 1, lastName: 1 }` (compound)
- `{ role: 1 }`
- `{ status: 1 }`
- `{ status: 1, role: 1, createdAt: -1 }` (admin listing)

### 5.2 Seller Schema (`seller.schema.ts`)

Collection: `sellers`

| Field              | Type | Required | Notes                                             |
|--------------------|------|----------|---------------------------------------------------|
| `user`             | ObjectId ref `User` | Yes | Links to user account |
| `businessAddress`  | Object | Yes | Nested doc: `address`, `landmark`, `city`, `state` (enum: `STATES_AND_UTS`), `pinCode` (6-digit), `country` (enum: `COUNTRIES`, default `"India"`), `pan` (10-digit), `gst` (15-digit) |
| `personalDetails`  | Object | Yes | `name`, `email`, `phoneNumber` |
| `businessDetails`  | Object | Yes | `name`, `email`, `phoneNumber`, `category` (enum: `SELLER_TYPES`) |
| `requiredDocuments`| Object | Yes | `gst`, `itr`, `geoTagging`, `addressProof` (all URLs/paths) |
| `approvalStatus`   | String (enum) | — | `PENDING`, `APPROVED`, `REJECTED` (default: `"PENDING"`) |
| `status`           | String (enum) | — | `ACTIVE`, `INACTIVE`, `DELETED` (default: `"ACTIVE"`) |
| `reason`           | String | — | — |

**Indexes:**
- `{ email: 1 }` unique
- `{ phoneNumber: 1 }` unique

### 5.3 Wishlist Schema (`wishlist.schema.ts`)

Collection: `wishlist`

| Field     | Type              | Required | Notes                           |
|-----------|-------------------|----------|---------------------------------|
| `user`    | ObjectId ref `User` | Yes   | Unique per user                 |
| `products`| [ObjectId ref `Product`] | No | Array of product references     |

**Indexes:**
- `{ user: 1 }` unique (one wishlist per user)

---

## 6. API Routes

All routes are mounted at `/api/v1` and protected by `X-Service-Secret` header.

### 6.1 Home & Health

| Method | Path         | Description              |
|--------|-------------|--------------------------|
| GET    | `/`          | Welcome message          |
| GET    | `/health`    | Health check             |

### 6.2 Auth Routes — `/api/v1/auth`

#### 6.2.1 Login — `/api/v1/auth/login`

| Method | Path                              | Auth   | Description                 |
|--------|-----------------------------------|--------|-----------------------------|
| POST   | `/auth/login/manual`              | None   | Manual email/phone + password login |
| GET    | `/auth/login/oauth/google/redirect`| None  | Get Google OAuth redirect URL |
| GET    | `/auth/login/oauth/google/callback`| None | Google OAuth callback       |
| GET    | `/auth/login/oauth/linkedin/redirect`| None | Get LinkedIn OAuth redirect URL |
| GET    | `/auth/login/oauth/linkedin/callback`| None | LinkedIn OAuth callback |
| GET    | `/auth/login/oauth/github/redirect` | None | Get GitHub OAuth redirect URL |
| GET    | `/auth/login/oauth/github/callback` | None | GitHub OAuth callback |

#### 6.2.2 Register — `/api/v1/auth/register`

| Method | Path                      | Auth   | Description                    |
|--------|---------------------------|--------|--------------------------------|
| POST   | `/auth/register/send-otp` | None   | Send OTP to email (start registration) |
| PATCH  | `/auth/register/resend-otp`| None  | Resend OTP (token in Authorization header) |
| POST   | `/auth/register/verify-otp`| None  | Verify OTP code                |
| POST   | `/auth/register/save-user`| None   | Save completed registration (first/last name, password, phone) |

#### 6.2.3 Logout — `/api/v1/auth/logout`

| Method | Path                      | Auth   | Description                    |
|--------|---------------------------|--------|--------------------------------|
| DELETE | `/auth/logout`            | User   | Invalidate user session in Redis |

#### 6.2.4 Password — `/api/v1/auth/password`

| Method | Path                              | Auth   | Description                                  |
|--------|-----------------------------------|--------|----------------------------------------------|
| POST   | `/auth/password/forgot-send-otp`  | None   | Send OTP for password reset                  |
| PATCH  | `/auth/password/forgot-resend-otp`| None   | Resend OTP for password reset                |
| POST   | `/auth/password/forgot-verify-otp`| None   | Verify OTP for password reset                |
| POST   | `/auth/password/forgot-save`      | None   | Save new password after OTP verify           |
| PATCH  | `/auth/password/change`           | User   | Change password when logged in (requires current password) |
| PATCH  | `/auth/password/set`              | User   | Set password for OAuth-only users (no current password needed) |

### 6.3 User Routes — `/api/v1/user`

| Method | Path                  | Auth   | Description                           |
|--------|-----------------------|--------|---------------------------------------|
| GET    | `/user/session`       | User   | Fetch current logged-in user's details |

---

## 7. Request Headers

| Header              | Purpose                                  |
|---------------------|------------------------------------------|
| `X-Service-Secret`  | Service-to-service authentication       |
| `X-User-Id`         | User ID (set by gateway)                 |
| `X-User-Role`       | User role (set by gateway)               |
| `X-Login-Role`      | Login role for role-based login attempts |
| `Authorization`     | Bearer token / OTP session token         |

---

## 8. Authentication Flow

### 8.1 Manual Login (`POST /auth/login/manual`)

1. Client sends `email` or `phoneNumber` + `password`.
2. Service looks up user by email or phone.
3. Checks that the user has `MANUAL` in `providers` array.
4. Optionally checks login role (via `X-Login-Role` header).
5. Compares `bcrypt` hash of provided password.
6. On success, returns minimal user object and stores in Redis cache (24h TTL).

### 8.2 OAuth Login (Google / LinkedIn / GitHub)

_Redirect Flow:_
1. `GET /auth/login/oauth/{provider}/redirect` → Returns provider's OAuth page URL.
2. Client redirects user to that URL.
3. Provider redirects back to `GET /auth/login/oauth/{provider}/callback?code=...`.
4. Service exchanges code for access token, fetches user profile.
5. Checks if a user with that email already exists:
   - **Exists + provider not linked** → Links provider to existing user.
   - **Exists + provider already linked** → Returns existing user.
   - **Doesn't exist** → Creates a new user with `proivers: [PROVIDER]`.
6. Returns minimal user object with Redis caching.

### 8.3 Registration Flow

Four-step OTP-based registration:

| Step | Endpoint                         | Purpose                          |
|------|----------------------------------|----------------------------------|
| 1    | `POST /auth/register/send-otp`   | Send OTP to email, returns `token` |
| 2    | `POST /auth/register/verify-otp` | Verify the received OTP code     |
| 3    | `POST /auth/register/save-user`  | Submit full registration data    |

- OTPs are stored in Redis with a **10-minute TTL**.
- OTP resend is rate-limited at `MAX_RESEND` (from `@beautinique/be-constants`).
- `sanitizeToken()` strips the `Bearer ` prefix from the Authorization header.
- On successful registration, user is created with `providers: ["MANUAL"]`.

### 8.4 Logout

- `DELETE /auth/logout` — reads `X-User-Id`, deletes user session from Redis cache.

---

## 9. Password Management

### 9.1 Forgot Password Flow

| Step | Endpoint                                | Purpose          |
|------|----------------------------------------|------------------|
| 1    | `POST /auth/password/forgot-send-otp`   | Send OTP to email |
| 2    | `PATCH /auth/password/forgot-resend-otp`| Resend OTP       |
| 3    | `POST /auth/password/forgot-verify-otp`| Verify OTP       |
| 4    | `POST /auth/password/forgot-save`       | Save new password |

- Resend-limited at `MAX_RESEND` attempts.
- New password cannot be identical to current password.
- After reset, user session is updated in Redis.

### 9.2 Change Password (`PATCH /auth/password/change`)

- Requires authenticated user (via `authenticate` middleware).
- Requires `currentPassword` (validated against bcrypt hash) + `password`.
- Both new and current passwords cannot be the same.

### 9.3 Set Password (`PATCH /auth/password/set`)

- Requires authenticated user.
- For users who signed up via OAuth only (password not yet set).
- If `MANUAL` provider is already linked, throws error (use forgot password instead).

---

## 10. Redis Cache (`RedisCache.ts`)

A singleton `RedisCache` class backed by a single Redis client.

### Key Prefixes

| Prefix          | Purpose              |
|-----------------|---------------------|
| `bq:user:<id>`  | User session data    |
| `bq:token:<token>` | OTP session data  |

### Public Methods

| Method                  | Description                                  |
|-------------------------|----------------------------------------------|
| `connect()`             | Connects to Redis                            |
| `close()`               | Gracefully closes Redis connection           |
| `setUser(user)`         | Cache user data (TTL: 24 hours)              |
| `getUser(userId)`       | Get user from cache or fallback to MongoDB   |
| `updateUser(user)`      | Update cached user                           |
| `deleteUser(userId)`    | Remove user from cache                       |
| `setOtpData(email)`     | Generate OTP + temp token, store in Redis (10 min TTL), return `{token, otp, email, sendCount}` |
| `getOtpData(token)`     | Retrieve OTP pair by token                   |
| `updateOtpData(token)`  | Refresh OTP + increment send count           |
| `deleteOtpData(token)`  | Remove OTP session from Redis                |

### Reconnection Strategy

Exponential backoff: `min(retries * 1000ms, 10s)`, max 5 retries.

---

## 11. Middlewares

### `authenticate` (middlewares/index.ts:7)

Extracts `X-User-Id` header → fetches user from Redis cache → attaches to `req.user`.

### `authorize` (middlewares/index.ts:25)

Factory middleware. Accepts an array of allowed roles → also fetches user from Redis → validates both `X-User-Id` and `X-User-Role` match the allowed roles.

### Built-in Middlewares (from `@beautinique/be-middlewares`)

| Middleware                        | Purpose                               |
|----------------------------------|---------------------------------------|
| `setRequestId`                   | Generates unique request ID           |
| `requestLogs`                    | Winston request logging               |
| `successResponse`                | Wraps `res.success()`                |
| `errorResponse`                  | Wraps `res.error()`                  |
| `checkDbConnection`              | Blocks requests if DB not connected   |
| `notFoundResponse`               | 404 handler                           |
| `errorLogs`                      | Winston error logging                 |
| `serviceAccess`                  | Validates `X-Service-Secret` header  |
| `tryCatchResponse`               | Wraps controller in try/catch         |
| `zodValidator`                   | Request body validation via Zod       |
| `checkEmptyRequest`              | Guards against empty request bodies   |

---

## 12. Services Layer (`services/index.ts`)

| Function                  | Description                              |
|---------------------------|------------------------------------------|
| `getUserById(data)`       | Find user by ObjectId; option to exclude password; option for lean query |
| `getUserByEmail(data)`    | Find user by email                       |
| `getUserByPhoneNumber(data)` | Find user by phone number             |
| `getUserByEmailOrPhone(data)` | Find user by email **or** phone; throws field-specific errors |
| `createNewUser(payload)`  | Create new user document                 |
| `updateUser(filter, payload)` | Update user using `findOneAndUpdate` |

---

## 13. Utilities (`utils/index.ts`)

| Function                 | Description                                  |
|--------------------------|----------------------------------------------|
| `createOAuthDbPayload`   | Builds OAuth user payload from third-party profile data |
| `getMinimalUser`         | Returns sanitized user object (converts `ObjectId` to string; excludes password, reason, createdAt, updatedAt) |
| `generateOtp`            | Returns a random 6-digit numeric OTP         |
| `generateTempToken(bytes)`| Returns a hex token (default 32 bytes = 64 chars) |
| `toObjectId(id)`         | Validates and converts string to `ObjectId`  |
| `getObjId(id)`           | Accepts string or `ObjectId`; returns `ObjectId` |

---

## 14. OAuth Integrations

### Google (`SocialAuth.ts → GoogleAuth`)

- Uses `googleapis` library (`google.auth.OAuth2`).
- `url()` generates the OAuth consent URL with `scope: [profile, email]`.
- `decode(code)` exchanges code for token, fetches user info from `https://www.googleapis.com/oauth2/v2/userinfo`.

### LinkedIn (`SocialAuth.ts → LinkedinAuth`)

- Directly constructs the authorization URL (no SDK).
- `access_token(code)` POSTs to `https://www.linkedin.com/oauth/v2/accessToken`.
- `decode(access_token)` GETs `https://api.linkedin.com/v2/userinfo`.

### GitHub (`SocialAuth.ts → GithubAuth`)

- Directly constructs the authorization URL.
- `access_token(code)` POSTs to `https://github.com/login/oauth/access_token`.
- `decode(access_token)` fetches profile from `https://api.github.com/user`. Falls back to `/user/emails` if email is not primary on the profile.

---

## 15. External OAuth Routes (for API reference)

These are the external URL endpoints all auth providers call (defined in `constants/index.ts` as `OAUTH_API_ROUTES_AND_METHODS`):

| Provider  | Method | URL                                              | Purpose              |
|-----------|--------|--------------------------------------------------|----------------------|
| Google    | GET    | `https://www.googleapis.com/oauth2/v2/userinfo` | Decode Google profile |
| LinkedIn  | POST   | `https://www.linkedin.com/oauth/v2/accessToken` | Get LinkedIn access token |
| LinkedIn  | GET    | `https://api.linkedin.com/v2/userinfo`           | Decode LinkedIn profile |
| GitHub    | POST   | `https://github.com/login/oauth/access_token`    | Get GitHub access token |
| GitHub    | GET    | `https://api.github.com/user`                    | Decode GitHub profile |
| GitHub    | GET    | `https://api.github.com/user/emails`             | Fetch GitHub user emails |

---

## 16. Error Handling

All errors are thrown using `AppError` from `@beautinique/be-classes`. Standard error codes used across the service:

| Code                     | HTTP Equivalent | When Used                         |
|--------------------------|-----------------|-----------------------------------|
| `BAD_REQUEST`            | 400             | Missing query/path parameters     |
| `VALIDATION_ERROR`       | 422             | Invalid OTP, wrong password       |
| `NOT_FOUND`              | 404             | User not found                    |
| `CONFLICT`               | 409             | Email/phone already exists        |
| `UNPROCESSABLE_ENTITY`   | 422             | Password same as current; OAuth+manual conflict |
| `AUTHENTICATION_ERROR`   | 401             | Not logged in / missing headers   |
| `AUTHORIZATION_ERROR`    | 403             | Insufficient role permissions     |
| `TOO_MANY_REQUESTS`      | 429             | Max OTP resend attempts exceeded  |
| `INTERNAL_SERVER_ERROR`  | 500             | Unexpected failures               |

Errors flow through `errorResponse` middleware which uses `envs.is_dev` to include/exclude stack traces.

---

## 17. Server Lifecycle — `src/index.ts`

### Startup

1. **Parse env vars** via `dotenv`.
2. **Set up Express** with body parsing, static serving, query parsing (`qs` module).
3. **Add middlewares** in order: `setRequestId` → JSON/URL parser → `requestLogs` → `successResponse` → `checkDbConnection`.
4. **Mount routes**: home `/`, health `/health`, API `/api/v1/*` wrapped with `serviceAccess` + router.
5. **Error handlers**: `notFoundResponse` → `errorLogs` → `errorResponse`.
6. **Listen** on `envs.port`. Track active connections for graceful shutdown.
7. **After server is up**: `connectToDB` (MongoDB) + `redisCache.connect()` (cache) + `bullQueue.connect` (job queue).

### Graceful Shutdown (SIGINT / SIGTERM)

1. Close Redis cache and BullMQ queue (via `Promise.allSettled`).
2. Stop accepting new connections.
3. Force-close hanging sockets after 10-second timeout.
4. Close HTTP server.
5. Exit `0` on success, `1` on failure.

---

## 18. Build & Run Commands

```bash
npm run dev            # Build watch + nodemon (tsx) — development
npm run build          # TypeScript compilation → dist/
npm run start          # node dist/index.js — production
npm run start:dev      # Build then start — production-like
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with auto-fix
npm run clean          # Remove dist/ directory
```

### Prettier Config

- Print width: 100
- Tab width: 2 (spaces)
- Single quotes
- Semi-colons: enabled
- Trailing commas: all

---

## 19. Shared Packages (`@beautinique/be-*`)

| Package                          | Version | Purpose                                            |
|----------------------------------|---------|----------------------------------------------------|
| `@beautinique/be-classes`        | ^1.0.5  | `AppError` for structured error handling           |
| `@beautinique/be-configs`        | ^1.0.5  | `connectToDB` for MongoDB connection               |
| `@beautinique/be-constants`      | ^1.0.8  | `ROLES`, `AUTH_PROVIDERS`, `HOUR`, `MINUTE`, etc.  |
| `@beautinique/be-jobs`           | ^1.0.5  | `bullQueue` for queue management                   |
| `@beautinique/be-middlewares`    | ^1.0.15 | Express middlewares (logging, validation, response)|
| `@beautinique/be-utils`          | ^1.0.4  | `stringifyData`, `parseData`, `sanitizeToken`      |
| `@beautinique/be-zod`            | ^1.0.17 | Zod schemas (`loginSchema`, `emailSchema`, `otpSchema`, etc.) |

---

## 20. Data Flow Examples

### Registration Flow

```
Client → POST /auth/register/send-otp { email }
  → GET user by email from DB
  → Store OTP in Redis (10 min TTL)  ← Returns { token, otp }
  → Enqueue "send-otp" job in mail-queue (BullMQ)

Client → POST /auth/register/verify-otp { otp } [AUTH: token]
  → Validate OTP in Redis

Client → POST /auth/register/save-user { firstName, lastName, password, phoneNumber } [AUTH: token]
  → Validate session in Redis
  → Check for email/phone conflicts in DB
  → bcrypt.hash(password)
  → create user in MongoDB + { providers: ["MANUAL"] }
  → Delete OTP session from Redis
  → Set user in Redis cache (24h TTL)
  → Return { user: minimalUser }
```

### Forgot Password Flow

```
Client → POST /auth/password/forgot-send-otp { email }
  → Validate user has MANUAL provider
  → Store OTP in Redis ← Returns { token, otp }
  → Enqueue "send-otp" in mail-queue

Client → POST /auth/password/forgot-verify-otp { otp } [AUTH: token]
  → Validate OTP in Redis

Client → POST /auth/password/forgot-save { password } [AUTH: token]
  → bcrypt.hash(new password)
  → Update password in MongoDB
  → Delete OTP session from Redis
  → Update user in Redis cache
  → Return { user: minimalUser }
```

### OAuth Login Flow

```
Client → GET /auth/login/oauth/{provider}/redirect
  ← Returns provider auth URL

User authenticates on provider site
Provider redirects to → GET /auth/login/oauth/{provider}/callback?code=...

Service:
  → Exchange code for access_token
  → Fetch user profile from provider API
  → Find user by email in MongoDB
  → IF exists + provider not linked: link provider, update avatar
  → IF doesn't exist: create new user with provider
  → Set user in Redis cache
  → Return { user: minimalUser }
```

---

## 21. API Response Format

All responses use the truncated-array-envelope format:
**body**

```json
{ "success": true, "message": "User logged in successfully", "data": { ... } }
```

*Note: The response shape is configured via middleware in `@beautinique/be-middlewares` with `app.use(successResponse)`.*

---

## 22. Key Relationships

```
User ──1→1─── Seller          (one seller profile per user)
User ──1→1─── Wishlist        (one wishlist per user)
User ──1→N─── Wishlist.products (many products per wishlist)
```

- `Seller.user`      → ref `User` (lookup: all sellers for a given user)
- `Wishlist.user`    → ref `User` (lookup: all wishlists for a given user)
- `Wishlist.products` → ref `Product` (lookup: all products in a wishlist)

*Note: `Seller` and `Wishlist` models are defined in `src/models/index.ts` but no CRUD controllers exist yet — they are available for use by other services.*
