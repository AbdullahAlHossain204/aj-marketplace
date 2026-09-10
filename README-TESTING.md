# AJ Market — Testing Guide (Phase 15)

## What exists and where

```
apps/api/src/**/__tests__/*.unit.test.ts        Unit tests — pure logic, no DB, no network
apps/api/src/__tests__integration/*.integration.test.ts   Integration tests — real Express app + real Postgres
apps/api/vitest.config.ts                       Config for unit tests (default `npm test`)
apps/api/vitest.integration.config.ts           Config for integration tests
```

## Unit tests — run these anywhere, right now

No database, no environment variables, no setup required.

```bash
cd apps/api
npm test
```

Covers: flash-sale effective-price calculation (`pricing.unit.test.ts`), product search/filter
query validation including a regression test for a real bug that was caught and fixed in Phase 9
(`products.schemas.unit.test.ts`), registration/login validation including the security-critical
"ADMIN can never self-register" check (`auth.schemas.unit.test.ts`), the RBAC middleware
(`requireRole.unit.test.ts`), and the order status state machines
(`vendor.service.unit.test.ts`, `orders.service.unit.test.ts`).

**47 tests, all passing**, verified at the time this suite was written.

### A real bug this suite caught

`AppError`'s constructor called `Object.setPrototypeOf(this, AppError.prototype)`
unconditionally. Because that runs via `super()` in every subclass constructor, it
silently overwrote the correct prototype every time — `err instanceof UnauthorizedError`
was always `false`, even for genuine `UnauthorizedError` instances. Nothing in production
code happened to check `instanceof` on the specific subclasses (only on `AppError` itself,
in `errorHandler.ts`), so this had zero live impact — but it's exactly the kind of latent
bug a real test suite exists to surface. Fixed in `src/lib/errors.ts`; the codebase targets
ES2022, where `class X extends Error` already sets the prototype chain correctly, so the
call was both unnecessary and actively wrong.

## Integration tests — require a real Postgres database

These exercise the actual Express app and a real database through Prisma. **They were
written and are believed correct, but could not be executed in the sandbox this project
was built in** — the sandbox's network policy blocks `binaries.prisma.sh`, so
`prisma generate` cannot complete there, the same limitation documented throughout every
phase of this project. Run them locally, where you have normal internet access:

```bash
cd apps/api
cp .env.example .env          # point DATABASE_URL at a real, ideally disposable, Postgres DB
npm run prisma:generate
npm run prisma:migrate
npm run test:integration
```

Covers: full register → login → protected-route auth flow, generic (non-revealing) login
failure messages, and — the highest-stakes area in a multi-vendor marketplace — cross-role
permission boundaries: a customer blocked from every admin and vendor route, a vendor
blocked from customer-only routes, and two separate vendors' product lists never leaking
into each other.

**Before trusting these against your own database:** use a disposable/test database, not
your real one — the tests create and delete real rows (scoped to unique per-run emails, but
still real writes).

## What Phase 15 intentionally does not include yet

- **End-to-end (browser) tests** — a Playwright/Cypress suite driving the actual Next.js
  frontend in a real browser. Not built in this phase: it needs both a running frontend and
  backend plus a real database, none of which this project's build sandbox has access to,
  and writing untested E2E test code is worse than not writing it — it would be guessing at
  selectors and flows without ever having run them. Recommended as a fast-follow once the
  app is running somewhere with real infrastructure.
- **Responsive/visual testing** — same constraint; genuinely requires a real browser
  environment (Playwright supports viewport-size testing well) to be worth anything.
- **Load/performance testing** — no realistic way to load-test against a database that
  doesn't exist yet in this environment.

## Every prior phase's verification approach, for context

Every phase of this project was verified the same honest way: real `tsc --noEmit`, real
`next build`, and — wherever a live database was needed — either a carefully-restored
in-memory mock proven identical to the original files afterward (diffed to confirm), or,
as of this phase, real `vitest` unit tests requiring no such workaround at all. Nothing in
this project claims to be tested without having actually been run.
