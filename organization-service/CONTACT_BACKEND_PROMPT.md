# Backend Prompt — "Contact Us" Feature

Hand this to whoever (or whichever session) builds the backend for the Contact Us feature.

## Scope

Build a backend service for the "Contact Us" feature on an e-commerce platform (Beautinique).
This is an **email-only** support flow — explicitly **no** live chat, **no** WebSockets, and **no**
inbound email parsing/webhooks. The "conversation" after the initial submission happens entirely
via the admin's own email client, replying directly to the user's email address.

Follow the existing API convention in this project: `base: '/api/v1'` with service-scoped routes
(`user-service`, `media-service`, `product-service` already exist). Add a new `organization-service`
following the same pattern.

## 1. Data model — `ContactQuery` collection

```
ContactQuery
├─ _id
├─ name: string
├─ email: string
├─ phoneNumber: string
├─ queryType: enum ['order', 'returns_refunds', 'payment', 'product_question', 'become_seller', 'account_help', 'feedback', 'other']
├─ message: string
├─ status: enum ['open', 'resolved']  (default: 'open')
└─ createdAt: Date
```

No separate `Message`/thread collection is needed — this is a single record per submission, not a
stored conversation log. The actual back-and-forth lives in email, outside this database.

## 2. Endpoint — `POST /organization-service/contact`

- Accepts `{ name, email, phoneNumber, queryType, message }`.
- Validates input (reuse this project's existing zod-schema conventions).
- Creates a `ContactQuery` document with `status: 'open'`.
- Returns `{ ticketId, status }` so the frontend can show a confirmation.

## 3. Emails (reuse the existing Brevo integration already used for OTP emails)

On successful submission, send two emails via the existing Brevo setup — **do not** introduce
nodemailer or a new email client; reuse whatever module already sends the register/forgot-password
OTP emails.

- **To the user** — acknowledgement:
  - Subject: `[Ticket #{ticketId}] Your query has been received`
  - Body: confirms the query about `{queryType}` was received and that a reply will follow.
- **To the support inbox** (e.g. `beautinique.bq@gmail.com`) — full submission details:
  - Subject: `[Ticket #{ticketId}] New Contact Query — {queryType}`
  - Body: name, email, phoneNumber, queryType, message — formatted so an admin can act on it
    directly (e.g. reply straight to the user's email from their own inbox).

**Important**: every email tied to a given ticket — the initial acknowledgement, and any later
admin reply — must include `[Ticket #{ticketId}]` in the subject line. This is the correlation
mechanism in place of email-thread headers, since a simple `mailto:`-based reply flow (used on the
admin panel — see below) cannot set `In-Reply-To`/`References` headers. Keep the subject-ID
convention consistent everywhere.

## 4. Admin-facing endpoints

For an admin panel to list and manage queries (UI itself is separate, but the backend needs to
support it):

- `GET /organization-service/contact` — list queries, filterable by `status` and `queryType`,
  paginated, sorted by `createdAt` descending.
- `PATCH /organization-service/contact/:id` — update `status` (e.g. mark `resolved`).

Each returned record must include enough data (`email`, `name`, `queryType`, `_id`) for the
frontend to build a `mailto:` link per query — clicking it opens the admin's own mail client with
a pre-filled reply (`To`, `Subject` with the ticket ID, and a quoted `Body`). This is a frontend
concern, but the backend response shape should make it trivial to construct.

## Explicitly out of scope

- Real-time chat / WebSocket connections.
- Inbound email parsing or webhooks.
- A `Message`/thread collection — status changes on `ContactQuery` are the only state tracked.
- Guaranteed email-client thread grouping — the ticket ID in the subject is the agreed-upon
  correlation mechanism instead.

## Why this approach (context for whoever picks this up)

A full live-chat system (sockets, presence, reconnection handling, anonymous-user access tokens)
was considered and explicitly rejected as disproportionate effort for a support-query feature.
This email-first approach reuses existing infrastructure (Brevo), needs no new real-time layer,
and matches how most e-commerce support actually works — users expect a ticket + follow-up email,
not an instant chat window.
