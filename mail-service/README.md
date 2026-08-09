# Mail Service — Documentation

**Project:** Beautinique (BQ-Microservices)
**Service:** Mail Service
**Author:** Nageshwar Pawar
**Version:** 1.0.0
**Port:** configured via `PORT` (see [§4](#4-environment-variables))

---

## 1. Overview

The Mail Service is the transactional-email microservice for the **Beautinique** platform. It has **no public "send email" HTTP endpoint** — it does one thing: run a single BullMQ worker that consumes `send-otp` jobs off the `mail-service-queue` queue (produced by `user-service`, on signup/login/forgot-password flows) and delivers them via the [Brevo](https://www.brevo.com/) transactional email REST API. It also serves its own documentation: `GET /` renders this README as HTML, and `GET /docs` serves an interactive Swagger UI.

**Why Brevo instead of raw SMTP:** this service originally sent mail via Nodemailer over SMTP (`smtp.gmail.com`). In production (Render), every SMTP connection attempt on both port 587 and 465 eventually failed - first with `ENETUNREACH` (Nodemailer's own DNS resolution picks a random address across both A/AAAA records, and Render has no outbound IPv6 route), then with `ETIMEDOUT` even after forcing IPv4 (Render and/or Google were silently dropping the connection regardless of port/family). None of that is fixable from application code - it's a network-level block on outbound SMTP from this host. Brevo's REST API runs over HTTPS on port 443, which every PaaS keeps open by definition (it's how their own tooling and everyone else's API traffic works), so it sidesteps the problem entirely. See [§15 Design Notes](#15-design-notes--known-trade-offs) for the full story.

---

## 2. Technology Stack

| Layer                    | Technology                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Runtime                  | Node.js (ES2025, ESM)                                                                         |
| Language                 | TypeScript 6.x (`strict`, `noUncheckedIndexedAccess`, `noEmitOnError`)                        |
| Framework                | Express.js 5.x                                                                                |
| Outbound email           | [Brevo](https://www.brevo.com/) transactional email API, via `@getbrevo/brevo` (official SDK) |
| HTML → plain-text        | `html-to-text`                                                                                |
| Background jobs / queue  | BullMQ (Redis), via `@beautinique/backend-bullmq`                                             |
| Logging                  | Pino, via `@beautinique/backend-logger`                                                       |
| API docs                 | OpenAPI 3.0 spec (hand-written) + `swagger-ui-express`                                        |
| README rendering         | `@beautinique/shared-markdown-to-html` (markdown → HTML)                                      |
| Shared response envelope | `@beautinique/backend-response`                                                               |
| Shared utilities         | `@beautinique/shared-utils`                                                                   |
| Shared constants         | `@beautinique/shared-constants`                                                               |
| Code quality             | ESLint (flat config, type-checked + strict), Prettier                                         |

---

## 3. Project Structure

```
mail-service/
├── src/
│   ├── index.ts                     # Entry point: loads env, sets IPv4-first DNS order, wires SIGINT/SIGTERM, calls startup()
│   ├── app.ts                       # Express app: middleware chain, routes, error handlers
│   ├── bootstrap/                   # Startup/shutdown orchestration
│   │   ├── startup.ts               #   HTTP server → mail transporter connect (retried in background) → worker
│   │   ├── shutdown.ts              #   HTTP server → worker → mail transporter, in order
│   │   └── server.ts                #   Low-level HTTP server lifecycle + connection tracking
│   ├── classes/
│   │   ├── index.ts                 #   Re-exports
│   │   ├── Transporter.ts           #   MailTransporter — Brevo REST API client, sendOtp
│   │   └── WorkerManager.ts         #   Owns the mail-service-queue BullMQ JobWorker
│   ├── configs/
│   │   └── index.ts                 #   Singletons: logger, workerManager, transporter
│   ├── constants/
│   │   └── index.ts                 #   METHODS_AND_PATHS, LOGGER_BASE_OPTIONS
│   ├── docs/
│   │   └── openapi.ts               #   Hand-written OpenAPI 3.0 spec, served at /docs
│   ├── envs/
│   │   └── index.ts                 #   process.env → typed envs, fail-fast on missing/invalid vars
│   ├── types/
│   │   └── index.ts                 #   (currently empty — no service-local types yet)
│   └── utils/
│       └── index.ts                 #   baseHtmlLayout, getOtpHtmlMessage
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

| Variable       | Required | Description                                                                |
| -------------- | -------- | -------------------------------------------------------------------------- |
| `PORT`         | Yes      | HTTP port to listen on (must be a positive integer)                        |
| `NODE_ENV`     | No       | `"development"` enables pretty logging and stack traces in error responses |
| `SERVICE_NAME` | Yes      | Name tag attached to every log line                                        |

### 4.2 Brevo — Transactional Email

| Variable        | Required | Description                                                                                                                                                |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BREVO_API_KEY` | Yes      | API key from [Brevo → Settings → API Keys](https://app.brevo.com/settings/keys/api)                                                                        |
| `MAIL_FROM`     | Yes      | Sender address on outgoing mail - must be a **verified sender** in Brevo (Settings → Senders; verifying a plain email address, no domain/DNS setup needed) |

### 4.3 Redis — BullMQ

| Variable           | Required | Description                                                    |
| ------------------ | -------- | -------------------------------------------------------------- |
| `BULL_MQ_HOST`     | Yes      | Redis host used for the `mail-service-queue` BullMQ connection |
| `BULL_MQ_PORT`     | Yes      | Redis port (must be a positive integer)                        |
| `BULL_MQ_PASSWORD` | No       | Redis password, if the instance requires auth                  |
| `BULL_MQ_USERNAME` | No       | Redis username, if the instance requires auth                  |

**This Redis instance is shared** across every service that produces or consumes `mail-service-queue` jobs (see [§7 Background Jobs](#7-background-jobs-mail-service-queue)) — it must point to the same instance everywhere, most notably wherever `user-service` runs.

---

## 5. API Routes

| Method | Path      | Auth | Description                                                           |
| ------ | --------- | ---- | --------------------------------------------------------------------- |
| GET    | `/`       | None | This README, pre-rendered to HTML by `scripts/generate-html.mjs`      |
| GET    | `/docs`   | None | Interactive Swagger UI (spec in `src/docs/openapi.ts`)                |
| GET    | `/health` | None | Liveness + mail/worker status (`{ data: { mail, worker, service } }`) |

That's the entire route table — this service has no `/api/v1/*` business API, no request headers to authenticate, and no per-route middleware beyond the global chain in `app.ts` (JSON/urlencoded parsing, static assets, request logging, `res.success`). `/`, `/docs`, and `/health` stay reachable regardless of Brevo/Redis state, since they don't depend on either.

`mail` reflects whether the Brevo API key last verified successfully (`MailTransporter.isConnected()`); `worker` reflects whether the `mail-service-queue` BullMQ worker is running (`WorkerManager.isRunning()`). Neither actively re-probes Brevo/Redis on every `/health` call — see [§15 Design Notes](#15-design-notes--known-trade-offs).

---

## 6. Email Delivery (`classes/Transporter.ts`)

A singleton `MailTransporter` class wrapping Brevo's official Node.js SDK (`@getbrevo/brevo`'s `BrevoClient`) - no SMTP, no Nodemailer, no persistent socket/connection pool to manage.

| Method                          | Description                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`                       | `client.account.getAccount()`, to confirm the API key is valid before accepting traffic; idempotent, sets `isConnected() → true`                          |
| `stop()`                        | Stateless HTTP client - nothing to close; just resets `isConnected() → false`                                                                             |
| `isConnected()`                 | Returns the last-known verified state, surfaced on `/health`                                                                                              |
| `sendOtp(to, otp)`              | Renders the OTP HTML email (`getOtpHtmlMessage`) and sends it via the private `sendMail` helper                                                           |
| `sendMail(options)` *(private)* | Converts the HTML to a plain-text fallback (`html-to-text`) and calls `client.transactionalEmails.sendTransacEmail(...)`, logging + rethrowing on failure |

**Request shape:** `sendTransacEmail({ sender: { name, email }, to: [{ email }], subject, htmlContent, textContent })`. On failure the SDK throws a typed `BrevoError` subclass (e.g. `UnauthorizedError`, `BadRequestError`) carrying `statusCode`/`body`/`message`.

---

## 7. Background Jobs (`mail-service-queue`)

Owned and consumed by `WorkerManager` (`classes/WorkerManager.ts`) — a single BullMQ `JobWorker` for the whole queue, concurrency 5.

| Job name   | Enqueued by                                                                             | What it does                                                                     |
| ---------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `send-otp` | `user-service` (`register`/`password` controllers — signup, login OTP, forgot-password) | `transporter.sendOtp(email, otp)` — renders the OTP email and sends it via Brevo |

Job payload shape (from `@beautinique/backend-bullmq`'s `QUEUE_SCHEMA`): `{ email: string; otp: string }`.

`mail-service` never enqueues jobs onto any queue itself — it is a consumer only. `media-queue` (used for Cloudinary media lifecycle) is owned end-to-end by `media-service` — unrelated to this service.

### Cross-service queue integration

Redis/BullMQ jobs are identified purely by queue name + job name at the Redis level, so any service can enqueue onto `mail-service-queue` as long as it targets the same Redis instance and uses `@beautinique/backend-bullmq` — `user-service` does this today. This means:

- The `BULL_MQ_*` env vars must point to the **same** Redis instance as every producer of `mail-service-queue`.
- If `mail-service-queue`'s schema/job names ever change in `backend-bullmq`, every producer needs a matching update, or `send-otp` jobs will silently stop being picked up here.

### Retry behavior

`JobWorker` applies `@beautinique/backend-bullmq`'s `DEFAULT_JOB_OPTIONS`: `attempts: 3` with exponential backoff (`delay: 1000`ms, doubling each retry). A failed `send-otp` handler logs the error + job data (`stringifyData`) and rethrows, so BullMQ picks it up as a retry rather than silently dropping it. Separately, the worker itself only *starts* once the mail transporter is confirmed connected (see [§11 Server Lifecycle](#11-server-lifecycle)), so it never picks up a job it can't yet send in the first place.

---

## 8. OTP Email Flow

```
user-service (register/password controller)
   │  bullQueue.addJob({ queueName: 'mail-service-queue', jobName: 'send-otp', data: { email, otp } })
   ▼
Redis (mail-service-queue)
   │  (async, on this service's JobWorker, concurrency 5)
   ▼
WorkerManager's 'send-otp' handler
   ▼
MailTransporter.sendOtp(email, otp)
   │  getOtpHtmlMessage(...)              # branded HTML email (utils/index.ts)
   │  html-to-text convert(...)           # plain-text fallback
   ▼
client.transactionalEmails.sendTransacEmail(...)   # @getbrevo/brevo SDK, HTTPS - not SMTP
   │  on failure: logs + rethrows → BullMQ retries (attempts: 3, exponential backoff)
   ▼
Email delivered
```

---

## 9. Utilities (`utils/index.ts`)

| Function                                      | Description                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `baseHtmlLayout(title, description, content)` | Beautinique-branded HTML email shell (header, card, footer) shared by every email template    |
| `getOtpHtmlMessage(title, otp)`               | Wraps `baseHtmlLayout` with the OTP-specific body (the code box, "valid for 10 minutes" copy) |

### External utility (from `@beautinique/*` packages)

| Function              | Package                     | Description                                                 |
| --------------------- | --------------------------- | ----------------------------------------------------------- |
| `stringifyData(data)` | `@beautinique/shared-utils` | Safe `JSON.stringify` wrapper used throughout error logging |

---

## 10. Error Handling

Mail-service has two independent error paths, since almost all of its real work happens off the HTTP request/response cycle:

- **HTTP layer** (`/`, `/docs`, `/health`): none of these routes contain business logic that can throw, so `errorResponse`/`notFoundResponse` (`@beautinique/backend-response`) exist mainly as the framework-level catch-all — an unmatched route gets a branded 404 HTML page for browser requests, JSON otherwise; a genuinely unexpected error becomes a generic `500` (`includeStack: envs.is_dev`), never leaking internals.
- **Job layer** (`send-otp` handler): a thrown error from `MailTransporter.sendMail` (bad API key, Brevo outage, invalid recipient, unverified sender, etc.) is logged with the error and the job's data, then rethrown — BullMQ's own `attempts`/`backoff` (see [§7 Retry behavior](#7-background-jobs-mail-service-queue)) governs retries, not `errorResponse`.

Unlike `media-service`, this service has no dependency on `@beautinique/backend-classes`' `AppError` hierarchy — it never needs structured HTTP error codes because it has no business API surface to protect.

---

## 11. Server Lifecycle

### Startup (`bootstrap/startup.ts`)

1. Start the HTTP server (`startHttpServer()`) - this alone unblocks `/`, `/docs`, `/health`.
2. **In the background, non-blocking:** connect the mail transporter (`transporter.start()`, i.e. verify the Brevo API key), retrying every 30s on failure until it succeeds or the process starts shutting down.
3. **In the background, non-blocking:** once the transporter reports connected, start the `mail-service-queue` worker (`workerManager.start()`); polls every 30s until that condition is met.

Idempotent (`setStarted()` guards re-entry). A slow/unreachable mail provider at boot no longer blocks the service from binding its port or answering `/health` - it just means `mail`/`worker` read `false` until the retry loop connects. On an HTTP-server startup failure specifically, logs and calls `process.exit(1)`.

### Graceful shutdown (`bootstrap/shutdown.ts`, `SIGINT`/`SIGTERM`)

1. Stop accepting new HTTP requests (`stopHttpServer`, existing requests finish first).
2. Stop the `mail-service-queue` worker.
3. Close the mail transporter.
4. Destroy any remaining open sockets.
5. Exit `0` on success, `1` on failure.

Idempotent (`setShuttingDown()` guards re-entry); every step's success/failure is logged individually (`Promise.all` + per-task `try/catch` — one task failing doesn't stop the others). The background retry loops in `startup.ts` check `isShuttingDown()` on every iteration so they stop looping instead of retrying forever during shutdown.

---

## 12. Build & Run Commands

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

### TypeScript strictness (`tsconfig.json`)

Beyond `strict: true`: `noUncheckedIndexedAccess` (indexed access is `T | undefined`, not `T`), `noEmitOnError` (a broken build produces no `dist/` output at all), `noUnusedLocals`/`noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. `declaration`/`declarationMap` are deliberately **off** — this is an application, not a package anything imports.

### ESLint (`eslint.config.mjs`)

Flat config: `@eslint/js` recommended → `typescript-eslint` recommended/strict/stylistic → type-checked variants (`recommendedTypeChecked`/`strictTypeChecked`/`stylisticTypeChecked` via `projectService`) → `simple-import-sort` → Prettier (last, disables conflicting stylistic rules). Notable custom rules: `no-floating-promises`/`no-misused-promises`/`require-await` (error), `no-explicit-any` (warn), `reportUnusedDisableDirectives` (error).

---

## 13. Shared Packages (`@beautinique/*`)

| Package                                | Purpose                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@beautinique/backend-bullmq`          | `JobWorker` — typed BullMQ wrapper, schema-checked jobs (`mail-service-queue`/`send-otp`)                     |
| `@beautinique/backend-logger`          | `createLogger`/`createHttpLogger` (Pino-based)                                                                |
| `@beautinique/backend-response`        | `successResponse`/`errorResponse`/`notFoundResponse`                                                          |
| `@beautinique/shared-constants`        | `SERVICE_NAMES_MAP`, `API_METHODS_MAP`                                                                        |
| `@beautinique/shared-markdown-to-html` | `generateHtmlFromMarkdown` — used by `scripts/generate-html.mjs` to render this README to `public/index.html` |
| `@beautinique/shared-utils`            | `stringifyData`, `requireEnv`, `requirePort`                                                                  |

---

## 14. API Response Format

All responses use `@beautinique/backend-response`'s envelope, attached via `app.use(successResponse({ defaultMessage: 'Success.' }))`:

```jsonc
// success
{ "success": true, "message": "Mail Service is healthy", "data": { "mail": true, "worker": true, "service": "mail-service" } }

// error
{ "success": false, "code": "INTERNAL_SERVER_ERROR", "message": "..." }
```

`res.success({ message, data })` — `data` is omitted entirely (not sent as `null`) when not provided.

---

## 15. Design Notes / Known Trade-offs

- **Why this service doesn't use SMTP anymore.** It originally did, via Nodemailer + a personal Gmail account (`smtp.gmail.com`). In production on Render this failed in two distinct ways, back to back:
  1. **`ENETUNREACH`** - Nodemailer resolves *both* A (IPv4) and AAAA (IPv6) records itself and picks a **random** address to connect to (`nodemailer/lib/shared/index.js`'s `formatDNSValue`). Render has no outbound IPv6 route, so any time the random pick landed on the IPv6 address, the connection failed instantly. `dns.setDefaultResultOrder('ipv4first')` (still set in `src/index.ts` as a general defensive default) does **not** fix this, because Nodemailer's resolution never calls `dns.lookup()` in the first place.
  2. **`ETIMEDOUT`** - after forcing a resolved IPv4 literal as the `host` (bypassing Nodemailer's resolver entirely), connections still hung for the full 120s timeout on *both* port 587 and 465. That rules out an IPv6-specific cause - it points to Render and/or Google silently dropping outbound SMTP traffic from this host's IP range altogether, which no amount of application-level DNS/port tuning can work around.

  Moving to Brevo's HTTPS REST API sidesteps the entire class of problem - port 443 outbound is never blocked by a PaaS (their own control plane depends on it), so there's no "wrong port"/"wrong IP family" failure mode left to hit.
- **`/health`'s `worker`/`mail` fields reflect local state, not a live re-check.** `JobWorker.isRunning()` is `true` as long as the worker hasn't been closed/paused — it doesn't actively probe Redis on every `/health` call. Likewise `isConnected()` reflects the *last* successful Brevo account check, not a fresh one. If Redis or Brevo becomes unreachable after startup, `/health` can still report both as healthy for a period before BullMQ's own error events (or the next send failure) surface the problem in logs.
- **Only one email type today.** `send-otp` is the only job handler; adding a new transactional email means adding both a producer call in the enqueuing service and a matching handler + template here.
- **Sender is a personal Gmail address, verified in Brevo.** Works well at Brevo's free tier (300 emails/day); if volume grows, the natural next step is verifying an owned domain in Brevo for better deliverability and a higher sending limit, not a code change.
- **`src/types/index.ts` is currently empty.** Kept as a scaffold for when this service needs service-local types; nothing imports it today.
- **`GET /` regenerates on `npm run build`, not `npm run dev`.** `public/index.html` is generated from `README.md` by the `postbuild` script (`scripts/generate-html.mjs`). Editing this file while running `npm run dev` won't update `GET /` until a build actually runs.

---

## 16. Data Flow Example — OTP Send

```
user-service → bullQueue.addJob('mail-service-queue', 'send-otp', { email, otp })
  (async, on this service's mail-service-queue worker)
  → WorkerManager's 'send-otp' handler
  → transporter.sendOtp(email, otp)
      → getOtpHtmlMessage(title, otp)         ← branded HTML
      → html-to-text convert(html)            ← plain-text fallback
      → client.transactionalEmails.sendTransacEmail({ sender, to, subject, htmlContent, textContent })
  ← email delivered (Brevo returns a messageId)

  (on failure at any step)
  → logger.error(...) with stringifyData(error) + stringifyData(data)
  → rethrow → BullMQ retries (attempts: 3, exponential backoff, delay 1000ms)
```
