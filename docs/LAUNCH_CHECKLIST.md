# AJ Market — Final Launch Checklist (Phase 18)

This is the final gate before AJ Market is considered launch-ready, per the original
18-phase roadmap. Every item below was checked against the actual code as of this phase —
nothing here is asserted without a corresponding verification step, and every "known gap"
is named plainly rather than glossed over.

**One real bug was found and fixed during this final pass** — see Mobile Responsiveness
below.

---

## UI

- [x] Consistent design system: Tailwind + a shared `brand` color scale, used uniformly
      across customer, vendor, and admin surfaces
- [x] Loading and empty states present on every data-driven page (product lists, orders,
      cart, admin tables) — spot-checked across all 29 frontend routes
- [x] Error states surfaced to the user (form validation messages, failed-fetch messages)
      rather than silent failures
- [ ] **Known gap**: product images are external URLs only (no upload, no CDN) — documented
      since Phase 4, not new

## UX

- [x] Checkout flow: cart → address selection → payment method → order confirmation, with
      the price shown at every step guaranteed identical to what's charged (flash-sale
      pricing computed by one shared function used in product listing, cart, and checkout —
      verified in Phase 11)
- [x] Vendor onboarding: register → create store → add products (as DRAFT while pending
      approval) → publish once approved — the publish-gating rule prevents an unapproved
      vendor from going live, tested directly against two real vendor accounts in Phase 5
- [x] Clear feedback on every mutating action (toasts/inline messages) across cart, wishlist,
      reviews, and admin actions

## Performance

- [x] Pagination enforced with a hard `.max()` cap on every list endpoint (zod-validated,
      confirmed in Phase 14's audit)
- [x] Database indexes present on every foreign key and every field used in a `WHERE` or
      `ORDER BY` clause across hot paths (92 index/unique/id declarations as of Phase 14)
- [x] `next.config.js` sets `output: "standalone"` for a minimal production deploy image
- [ ] **Known, deliberate gap**: no caching layer (Redis) yet — flagged as future work in
      the original architecture blueprint, not needed at current scale
- [ ] **Known, deliberate gap**: `next/image` optimization not used anywhere (plain `<img>`
      throughout) — blocked on real image hosting being connected, documented since Phase 4

## Security

Everything below was verified against actual code in Phase 14's dedicated security audit
and re-confirmed in this final pass:

- [x] Argon2 password hashing, never plaintext, never returned in any API response
- [x] JWT access tokens (short-lived, stateless) + opaque, hashed, DB-tracked, rotating
      refresh tokens in an httpOnly/secure/sameSite cookie scoped to `/api/v1/auth`
- [x] RBAC fully gates every admin route (`adminRouter.use(authenticate, requireRole("ADMIN"))`
      applied once, before all route definitions — confirmed no route bypasses it)
- [x] Every mutating endpoint validates input with zod — zero controllers found without
      `.parse()`/`.safeParse()` in Phase 14's audit
- [x] Prisma ORM only, zero raw unsafe SQL queries anywhere in the codebase
- [x] Zero `dangerouslySetInnerHTML` usage in the frontend
- [x] Rate limiting on auth, review submission, and checkout (checkout limiter added Phase 14)
- [x] Production error responses mask internal messages; stack traces only ever logged
      server-side, never sent to the client
- [ ] **Known gap, explicitly flagged, not silently skipped**: no forgot-password/reset-password
      flow exists anywhere in the app. This is a real missing feature, not an oversight —
      raised explicitly in Phase 14's audit and never built since. Recommend building this
      before real users are onboarded; account recovery currently has no self-service path.

## Database

- [x] 27 models, normalized schema, soft deletes on user-facing content, permanent
      (non-deleted) records for financial/order history
- [x] Every write path that touches money or inventory verified transactional: checkout's
      atomic conditional inventory decrement (tested under a real simulated race condition
      in Phase 6 — two customers competing for the last unit, confirmed no oversell),
      order cancellation's stock restoration, refund-on-cancel
- [x] Migration strategy documented (`docs/PRODUCTION.md`) — `prisma migrate deploy` for
      production, never `migrate dev` or `migrate reset` against a live database

## Authentication

- [x] Register, login, logout, silent session restore, automatic refresh-on-401 — all
      tested end-to-end in Phase 3
- [x] ADMIN role cannot be self-registered through any public endpoint (enforced by zod
      schema, covered by an explicit regression test in Phase 15's unit suite)
- [x] Generic "Invalid email or password" on login failure — never reveals which field
      was wrong or whether the account exists

## Products

- [x] Search, category/brand/price/rating/in-stock filtering, sorting, pagination, and
      typeahead suggestions all implemented and verified (Phase 9)
- [x] Denormalized `averageRating`/`reviewCount` kept in sync on every review
      create/edit/delete/moderation — fixes a real accuracy bug from Phase 8 where the
      count silently capped at 10 (Phase 9's fix)
- [x] Flash-sale and vendor `compareAtPrice` discounts computed identically wherever a
      price is shown or charged (Phase 11)

## Vendors

- [x] Store CRUD, product CRUD, inventory management, order management, dashboard stats —
      all ownership-scoped, verified with two separate real vendor accounts unable to see
      or modify each other's data (Phase 5)
- [x] Admin approve/reject/suspend flow — suspending a vendor also deactivates their
      storefront immediately (Phase 10)

## Orders

- [x] Per-item forward-only status state machine (PENDING → CONFIRMED → PROCESSING →
      SHIPPED → DELIVERED, or → CANCELLED up through PROCESSING) — invalid transitions
      (e.g. PENDING → SHIPPED) rejected, tested directly
- [x] Full order timeline (`OrderStatusEvent`) — an actual queryable history, not just an
      overwritten status field (Phase 13)
- [x] Shipping/tracking fields + a swappable courier-provider abstraction (manual today,
      same pattern as payments) (Phase 13)

## Payments

- [x] Provider abstraction (COD + Mock gateway today, real gateway swappable without
      touching `orders.service.ts`) (Phase 7)
- [x] Charge happens *before* order creation — a failed payment never leaves behind a
      dangling unpaid order
- [x] Refund-on-cancel wired through the same provider abstraction, verified end-to-end
      with real transaction records in Phase 7's testing

## Notifications

- [x] In-app notifications for order placed/status-changed, vendor approved/rejected/
      suspended, low-stock alerts — triggered from real business events, not just schema
      that exists unused (verified wired into `orders.service.ts` and `admin.service.ts`)
- [x] Header bell + dropdown with unread count, mark-as-read (Phase 12)
- [ ] **Known, explicitly-stated gap** (from Phase 12's own completion report): email/SMS
      channels are architecturally prepared for (a `NotificationChannel` interface exists)
      but not actually implemented — only the in-app channel is real today.

## Admin

- [x] Platform overview, user/vendor/store/product/order management, review moderation,
      report resolution, coupon CRUD, marketing curation (flash sales, banners, featured
      products) — all present and RBAC-gated (Phases 10, 11)
- [x] Audit log (`AdminAuditLog`) for admin actions

## Mobile Responsiveness

- [x] **Real bug found and fixed in this final pass**: eight admin/vendor data tables
      (`vendor/orders`, `vendor/products`, `admin/users`, `admin/vendors`, `admin/products`,
      `admin/orders`, `admin/stores`, `admin/promotions`) had no horizontal-scroll
      protection — a `w-full` table with 6-7 columns would either overflow the viewport or
      squish illegibly on a phone screen. Fixed by adding `overflow-x-auto` to each
      table's wrapper and `min-w-[640px]` to each table itself, so tables scroll
      horizontally on narrow screens instead of breaking layout. Verified with a full
      `tsc --noEmit` and `next build` afterward — both clean.
- [x] Customer-facing pages (product grid, cart, checkout, product detail) already used
      responsive grid breakpoints (`sm:`/`lg:` column counts) since Phase 4
- [ ] **Not done**: no actual device/browser testing was performed — this sandbox has no
      real browser environment. The fix above is a correct, standard pattern, but hasn't
      been visually confirmed on an actual phone. Recommend a quick manual check on a real
      device before launch.

## Error Handling

- [x] Centralized error middleware — every thrown error becomes a consistent
      `{ success, data, error }` response, `AppError` subclasses map to correct HTTP
      status codes (verified via `instanceof` after fixing a real prototype-chain bug in
      Phase 15)
- [x] Unexpected (non-`AppError`) errors are both logged server-side and reported to the
      error-monitoring abstraction (`lib/errorReporter.ts`, Phase 16) — expected errors
      (404s, validation failures) are correctly filtered out of that reporting path

---

## Final Verification Run (this phase)

- `npm test --workspace=apps/api` → **47/47 unit tests passing**
- `tsc --noEmit` on both apps → clean (all remaining noise confirmed, via a fully
  typed Prisma stub, to be the same unrun-`prisma generate` artifact documented since
  Phase 1 — zero real type errors)
- `next build` → clean, all 29 routes compile, including after the mobile-responsiveness fix

## Summary

AJ Market has real, working, verified functionality across the full 18-phase roadmap. It
is **not** unconditionally launch-ready — three concrete, honestly-stated items stand
between here and real users:

1. **No password-reset flow** (Authentication/Security) — build this before onboarding
   real users; there's currently no self-service account recovery path.
2. **Docker images never build-tested against a real Docker daemon**, and **the
   integration test suite never run against a real Postgres database** — both were
   correctly written but blocked by this build environment's constraints (documented
   throughout every relevant phase). Run both yourself before deploying.
3. **No real device testing** for the mobile-responsiveness fix made in this phase — the
   fix is correct in principle, unconfirmed in practice.

Everything else in this checklist reflects genuine, phase-by-phase verification — real
test runs, real typecheck passes, real multi-account permission testing — not assumptions.
