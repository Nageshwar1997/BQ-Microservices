# Mail Service

Sends transactional email for the Beautinique platform over SMTP
(Nodemailer). Currently the only email type is OTP verification. This
service has **no public "send email" HTTP endpoint** - work arrives
asynchronously as BullMQ jobs on the `mail-queue` queue, produced by other
services (e.g. `user-service`) and consumed here by a single background
worker.

## Tech stack

| Concern                 | Package / Tool                            |
| ------------------------ | ------------------------------------------ |
| HTTP framework            | Express 5                                  |
| Outbound email             | Nodemailer (SMTP)                          |
| HTML → plain-text fallback | `html-to-text`                             |
| Background jobs/Queue      | BullMQ (Redis), via `@beautinique/backend-bullmq` |
| Logging                    | Pino, via `@beautinique/backend-logger`    |
| Shared response shape      | `@beautinique/backend-response`            |
| Shared constants           | `@beautinique/shared-constants`            |
| API docs                   | `swagger-ui-express`                       |
| README → HTML              | `marked` (build-time, see below)           |

## Running locally

```bash
npm install
npm run dev          # tsc --noEmit --watch + nodemon, auto-restarts on src changes
```

Other scripts:

```bash
npm run build         # docs:build (README → public/index.html) + tsc -> dist/
npm run start          # node dist/index.js (run build first)
npm run start:dev      # build + start in one step
npm run lint            # eslint src
npm run lint:fix
npm run docs:build     # regenerate public/index.html from this README
```

Requires a `.env` file (see [Environment variables](#environment-variables)),
a reachable Redis instance (**shared** with `user-service`, which produces
the `send-otp` jobs this service consumes), and SMTP credentials (a Gmail
account + [app password](https://myaccount.google.com/apppasswords) works
for `MAIL_HOST=smtp.gmail.com`).

## Environment variables

| Variable                                                                  | Purpose                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `PORT`                                                                    | HTTP port to listen on                                               |
| `IS_DEV`                                                                  | `'true'` enables pretty logging and stack traces in error responses  |
| `SERVICE_NAME`                                                            | Name tag attached to every log line                                  |
| `MAIL_HOST` / `MAIL_PORT`                                                 | SMTP server to connect to (e.g. `smtp.gmail.com` / `587`)            |
| `MAIL_USER` / `MAIL_PASS`                                                 | SMTP auth credentials                                                |
| `MAIL_FROM`                                                               | `From` address on outgoing mail                                      |
| `BULL_MQ_HOST` / `BULL_MQ_PORT` / `BULL_MQ_PASSWORD` / `BULL_MQ_USERNAME` | Redis connection used for BullMQ (see [Cross-service queue integration](#cross-service-queue-integration)) |

## HTTP endpoints

This service exposes no authenticated or business API - only the three
routes every Beautinique service keeps unauthenticated so they stay
reachable for load balancer / uptime checks regardless of downstream state:

| Method | Path      | Auth | Purpose                                                                |
| ------ | --------- | ---- | ------------------------------------------------------------------------ |
| GET    | `/`       | none | This README, rendered as HTML                                          |
| GET    | `/docs`   | none | Interactive API docs (Swagger UI, spec in [src/docs/openapi.ts](src/docs/openapi.ts)) |
| GET    | `/health` | none | Liveness + SMTP/worker status (`{ data: { mail, worker, service } }`)  |

`mail` reflects whether the SMTP transporter last verified successfully;
`worker` reflects whether the `mail-queue` BullMQ worker is running. Neither
actively re-checks Redis connectivity on every `/health` call - see
[Design notes](#design-notes--known-trade-offs).

## Background jobs (`mail-queue`)

Owned and consumed by this service's `WorkerManager`
([src/classes/WorkerManager.ts](src/classes/WorkerManager.ts)) - a single
BullMQ `JobWorker` with concurrency 5.

| Job name   | Enqueued by                                                             | What it does                                                            |
| ---------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `send-otp` | `user-service` (`register`/`password` controllers, on signup, login OTP, forgot-password) | Renders the OTP HTML email ([src/utils/index.ts](src/utils/index.ts)) and sends it over SMTP via `NodemailerTransporter.sendOtp` |

`mail-service` never enqueues jobs onto any queue itself - it is a consumer
only.

## Email delivery

- **Transport**: [src/classes/Transporter.ts](src/classes/Transporter.ts)
  wraps a single pooled Nodemailer SMTP transport (`pool: true`), sized to
  the worker's concurrency (5) so OTP sends reuse connections instead of
  opening a fresh SMTP/TLS handshake per email.
- **Template**: `getOtpHtmlMessage` builds a branded HTML email
  (`baseHtmlLayout`); `html-to-text` derives the plain-text fallback part
  sent alongside it.
- **Failures**: a failed `sendMail` rethrows out of the `send-otp` handler,
  which BullMQ retries per its default job options (`attempts: 3`,
  exponential backoff) from `@beautinique/backend-bullmq`.

## Graceful startup / shutdown

[src/bootstrap/startup.ts](src/bootstrap/startup.ts) /
[src/bootstrap/shutdown.ts](src/bootstrap/shutdown.ts), wired to
`SIGINT`/`SIGTERM` in [src/index.ts](src/index.ts):

- **Startup**: start the HTTP server and verify the SMTP transporter (in
  parallel) → start the `mail-queue` worker.
- **Shutdown**: stop accepting new HTTP requests → stop the worker → close
  the SMTP transporter → destroy any lingering sockets → exit. Idempotent
  (safe to call more than once); every step's success/failure is logged
  individually.

## Cross-service queue integration

Redis/BullMQ jobs are identified purely by queue name + job name at the
Redis level, so any service can enqueue onto `mail-queue` as long as it
targets the same Redis instance and uses `@beautinique/backend-bullmq` -
`user-service` does this today. This means:

- The `BULL_MQ_*` env vars must point to the **same** Redis instance as
  every producer of `mail-queue`.
- If `mail-queue`'s schema/job names ever change in `backend-bullmq`, every
  producer needs a matching update, or `send-otp` jobs will silently stop
  being picked up here.

## Design notes / known trade-offs

- **`/health`'s `worker` field reflects local worker state, not live Redis
  connectivity.** `JobWorker.isRunning()` (from `bullmq`) is `true` as long
  as the worker hasn't been closed/paused - it doesn't actively probe Redis.
  If Redis becomes unreachable after startup, `/health` can still report
  `worker: true` for a period before BullMQ's own reconnect/error events
  surface the problem in logs.
- **Only one email type today.** `send-otp` is the only job handler; adding
  a new transactional email means adding both a producer call in the
  enqueuing service and a matching handler + template here.
- **SMTP via a personal Gmail account.** Works fine at low volume with an
  app password, but Gmail enforces sending-rate limits not designed for
  production transactional-email traffic - worth moving to a dedicated
  provider (SES, Postmark, SendGrid, etc.) if OTP volume grows.
