# AJ Market — Testing Guide

## Unit tests — run these anywhere, right now

```bash
cd apps/api
npm test
```

No database, no environment variables required. **47 tests, all passing.**

Covers: flash-sale pricing math (`pricing.unit.test.ts`), product search/filter validation
including a regression test for a real bug caught and fixed in Phase 9
(`products.schemas.unit.test.ts`), registration/login validation including the
security-critical "ADMIN can never self-register" check (`auth.schemas.unit.test.ts`), the
RBAC middleware (`requireRole.unit.test.ts`), and both order-status state machines
(`vendor.service.unit.test.ts`, `orders.service.unit.test.ts`).

### A real bug this suite caught

`AppError`'s constructor called `Object.setPrototypeOf(this, AppError.prototype)`
unconditionally, which silently broke `instanceof` for every subclass
(`UnauthorizedError`, `ForbiddenError`, etc.) — see `src/lib/errors.ts` for the full
explanation. Nothing in production code happened to check `instanceof` on the specific
subclasses, so it had zero live impact, but it's exactly the kind of latent bug a real
test suite exists to catch. Fixed outright.

## Integration tests — require a real Postgres database

```bash
cd apps/api
cp .env.example .env          # point DATABASE_URL at a real, disposable Postgres DB
npm run prisma:generate
npm run prisma:migrate
npm run test:integration
```

Written and believed correct, but **could not be executed in the sandbox this project was
built in** — its network policy blocks `binaries.prisma.sh`, so `prisma generate` never
completes there. Same limitation documented throughout every phase of this project.

Covers the full register → login → protected-route flow, and — the highest-stakes area in
a multi-vendor marketplace — cross-role permission boundaries: a customer blocked from
every admin/vendor route, a vendor blocked from customer-only routes, and two separate
vendors' product lists never leaking into each other.

**Use a disposable/test database**, not your real one — these tests write real rows.

## CI

`.github/workflows/ci.yml` runs typecheck + build + unit tests on every push/PR to `main`.
It does **not** run the integration suite (no database available in CI as configured) —
add a Postgres service container to the workflow if you want that automated too.

## Not included yet, and why

- **E2E/browser tests (Playwright/Cypress)** — need a running frontend, backend, and
  database simultaneously, none of which existed in this build environment. Writing
  selectors against an app that was never actually booted would be guessing, not testing.
- **Responsive/visual testing** — same constraint, genuinely needs a real browser.
- **Load testing** — no realistic target to load-test against yet.

All three are reasonable fast-follows once the app is deployed somewhere real.
