# Seller Feature — Implementation Plan (review before I write code)

## 1. Scope for this turn

**A.** Rework `src/classes/redis/RedisCacheSeller.ts` — currently a straight copy-paste
of `product-service`'s `RedisCacheDashboard.ts` (still has `DRAFT_PRODUCT_KEY`,
`TDraftProductDetailsZodSchema`, etc.). Needs to become genuinely seller-domain.

**B.** Implement `src/controllers/seller/createSeller.controller.ts` — Admin/Master
turns an existing platform user into a Seller. Needs: a real `Seller` mongoose
schema, zod validation, the route, and full edge-case handling.

## 2. What's already in place (found while exploring)

- `RedisCacheManager` already wires up `this.seller = new RedisCacheSeller(...)`
  (your commit `b77dcf5`), with a commented-out `this.team` next to it.
- `src/constants/index.ts` already has `SELLER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED']`,
  unused so far.
- `src/controllers/seller/` is scaffolded: `createSeller.controller.ts` (stub),
  `updateSeller.controller.ts` (stub), `index.ts` (re-exports both).
- `src/controllers/seller/temp/` (your commits `b77dcf5` + `ec1598d`) has a
  **4-step seller onboarding wizard** already drafted:
  `businessDetails → bankDetails → address → documents` (+ implied `review` step,
  per `DRAFT_SELLER_STEP_MAP`). Field-level zod schemas already written for each step.
- `user-service` already has its own `Seller` mongoose schema
  (`businessAddress`, `personalDetails`, `businessDetails`, `requiredDocuments`,
  `approvalStatus`, `status`) — but **no controller/route anywhere reads or
  writes it**. It's dead code today.
- Packages moved since we last touched this: `@beautinique/shared-constants` /
  `@beautinique/shared-zod` are no longer direct deps — `@beautinique/backend-constants`
  (aliases `shared-constants`) and `@beautinique/backend-zod` (now `1.0.28`) are.
  `backend-zod` now has a dedicated `organization-service` submodule in the
  package itself (two of the contact-feature's zod schemas already live there,
  not locally) and exposes bare `object`/`string`/`literal`/`z`/`TInfer` helpers
  — matching the style your `temp/schema.ts` already uses.
- `CONTACT_QUERY_TYPES` includes `'Become a Seller'` — the natural on-ramp: a
  user contacts support to become a seller, admin reviews, then uses this
  `createSeller` endpoint.

## 3. Decisions I need your call on

### Q1 — Where does seller data come from?
- **(a) Admin submits the full payload directly** in the `POST` body (business +
  bank + address + documents, all at once). Simple, no dependency on anything
  else existing yet.
- **(b) `createSeller` finalizes an existing Redis draft** — reads the target
  user's assembled wizard steps (the `temp/` schemas) from `RedisCacheSeller`
  and persists them. Requires a self-service "save draft step" endpoint to
  exist first (doesn't yet).

**My recommendation: (a).** Keeps this task self-contained. I'll still build the
*draft-cache* methods on `RedisCacheSeller` (mirroring `RedisCacheDashboard`,
which is what you asked for), but nothing will call them yet — they're ready
for whenever the self-service wizard endpoints get built separately.

### Q2 — Does the target User's `role` actually flip to `SELLER`?
`organization-service` and `user-service` are separate services with separate
databases — the `User` document (and its `role` field) lives in `user-service`.
For "Admin makes a User a Seller" to be true end-to-end (not just a DB row in
`organization-service`), something needs to call into `user-service` to
promote the role.
- **(a) Add a new internal endpoint in `user-service`** (e.g.
  `PATCH /api/v1/user/:id/role`, service-secret protected, no such endpoint
  exists today) and have `createSeller` call it over HTTP after creating the
  `Seller` record.
- **(b) Skip role mutation for now** — this endpoint only creates the `Seller`
  record in `organization-service`; wiring the actual role flip is a separate
  follow-up task.

**My recommendation: (a), but flagging it clearly** — this is the one part of
"complete integration" that reaches into a different service/repo than what
you asked me to touch this turn. I want your explicit go-ahead before I add
anything to `user-service`. If you'd rather do that endpoint yourself and just
have me leave a clear TODO + typed stub call-site, that works too.

### Q3 — The old, unused `Seller` schema in `user-service`
Not referenced by any controller. I'll leave it untouched either way (not
deleting other-service code without being asked) — just flagging it as
pre-existing dead weight, in case you want it removed later.

### Q4 — `updateSeller.controller.ts`
Also a stub in the same folder. Out of scope for this pass unless you want it
bundled in now — my default is to leave it as `export {}` and only build
`createSeller`.

### Q5 — Required vs. optional fields
Should `createSeller` require **all** of business + bank + address + documents
in one shot (full KYC upfront, matching all 4 `temp/` steps), or can documents
be added later via `updateSeller`? **My recommendation:** require all of it —
an admin directly creating a seller should be doing so off a fully verified
application, not a partial one.

### Q6 — Approval status on admin-created sellers
Since an admin is creating this directly (not approving a pending
self-submitted application), **I'll default `approvalStatus: 'APPROVED'`**
and `status: 'ACTIVE'` immediately — no separate approval step. Flag if you
want it to land as `PENDING` instead.

## 4. Proposed data model — `src/schemas/seller.schema.ts`

```
Seller
├─ _id
├─ user: ObjectId (ref, required, unique - one seller profile per user)
├─ businessDetails
│  ├─ name, type (enum SELLER_TYPES), email, phoneNumber, gstin, pan
├─ bankDetails
│  ├─ accountHolderName, accountNumber, ifscCode, bankName
├─ address
│  ├─ line1, line2?, city, state (enum STATES_AND_UTS), pincode, country (enum COUNTRIES)
├─ documents
│  ├─ id, address, license, pan, gst, bank  (image URLs - already uploaded via media-service)
├─ approvalStatus: enum SELLER_APPROVAL_STATUS  (default 'APPROVED', see Q6)
├─ status: 'ACTIVE' | 'SUSPENDED'  (default 'ACTIVE' - lets admin suspend later)
├─ createdBy: ObjectId  (the admin/master who created this record - audit trail)
├─ reason: string  (optional - populated if ever suspended/rejected later)
└─ timestamps (createdAt, updatedAt)
```

Unique indexes: `user`, `businessDetails.email`, `businessDetails.phoneNumber`,
`businessDetails.gstin`, `businessDetails.pan`, `bankDetails.accountNumber`.

## 5. Proposed API

```
POST /api/v1/seller
```
- `authorize([ADMIN, MASTER])`
- Body: `{ userId, businessDetails, bankDetails, address, documents }`
- Response: `{ success, message, data: <created seller> }`, `201`

## 6. Proposed `RedisCacheSeller` methods (mirroring `RedisCacheDashboard`'s shape)

```
DRAFT (self-service wizard, keyed by userId, hash + TTL, unused by any route yet)
  getDraftSeller(userId)
  saveDraftSellerStep(userId, stepData)
  deleteDraftSeller(userId)
  hasDraftSeller(userId)

PERSISTED (keyed by seller id / userId, warms admin + seller-profile reads)
  getSellerById(id)
  setSeller(id, seller)
  deleteSeller(id)
  hasSeller(id)
```

## 7. Edge cases `createSeller` needs to handle

- Target `userId` missing/malformed → 422 validation error.
- (If Q2 = a) Target user doesn't exist in `user-service` → 404.
- Target user already `SELLER`/`ADMIN`/`MASTER` → 409 conflict.
- A `Seller` document already exists for that `user` → 409 conflict (don't
  silently overwrite).
- Duplicate `businessDetails.email` / `.phoneNumber` / `.gstin` / `.pan` /
  `bankDetails.accountNumber` already used by another seller → 422 with
  field-level errors (pre-check + rely on unique index as the backstop).
- Invalid GSTIN/PAN/IFSC/pincode format → 422 (zod regex validation).
- Malformed/non-URL document values → 422.
- Partial failure: `Seller` created in `organization-service` but the
  role-promotion call to `user-service` fails (only relevant if Q2 = a) →
  needs a rollback (delete the just-created `Seller`) or a clear
  "created but role sync failed, retry" signal — won't silently leave it
  half-done.
- Concurrent double-submit for the same user → unique index on `user` is the
  final guard even if the pre-check race loses.

## 8. Files I'll touch (once confirmed)

- `src/classes/redis/RedisCacheSeller.ts` — rewrite (task A)
- `src/schemas/seller.schema.ts` — new (mongoose)
- `src/schemas/seller.zod.ts` — new (validation, adapted from `temp/schema.ts`
  to the fields above)
- `src/schemas/index.ts` — export the above
- `src/models/index.ts` — add `Seller` model
- `src/types/index.ts` — `TSeller`, request/response types
- `src/constants/index.ts` — `METHODS_AND_PATHS.seller`
- `src/controllers/seller/createSeller.controller.ts` — implement
- `src/routes/seller/index.ts` — new
- `src/routes/index.ts` — mount it
- *(only if Q2 = a)* something in `user-service` for the role-promotion
  endpoint, plus a small HTTP client in `organization-service` to call it

Not touching in this pass: `updateSeller.controller.ts`, the self-service
draft-save route, anything in `user-service`'s existing (unused) `Seller`
schema.

## 9. Next step

Waiting on your answers to Q1–Q6 above (or your own alternative) before
writing any code.
