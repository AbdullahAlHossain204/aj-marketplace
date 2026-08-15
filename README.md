# AJ Marketplace

- **Phase 1 — Architecture**: see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for
  the full stack rationale, system diagram, database ERD, folder structure, auth/API/
  payment architecture, and development roadmap.
- **Phase 2 — Foundation** (this codebase): project setup, database schema,
  authentication + RBAC, base UI system, environment config, and a basic API
  structure (auth + health check). No storefront/seller/admin UI yet — that's
  Phases 3–5.

## What's implemented

- **Next.js 14 (App Router) + TypeScript (strict)** project scaffold
- **Prisma schema** implementing the full ERD from Phase 1 (users, roles/permissions,
  sellers, stores, products/variants, inventory, cart, orders → seller-orders → items,
  payments, shipments, reviews, coupons, commission ledger, audit log)
- **Authentication**: NextAuth.js with credentials provider, database-backed sessions,
  bcrypt password hashing, Redis-backed login rate limiting
- **RBAC**: `lib/auth/rbac.ts` re-derives role/permissions from the DB on every check
  (never trusts a cached session role for authorization-critical decisions), plus a
  `requireStoreOwnership` helper so a seller can never touch another store's data
- **Middleware**: redirects unauthenticated/wrong-role users away from `/admin`,
  `/seller`, `/account` — a first line of defense, not the only one; every sensitive
  API route re-checks server-side
- **Admin bootstrap**: `prisma/seed.ts` creates the admin account from environment
  variables (`ADMIN_BOOTSTRAP_*`) — the credentials from your spec are seed values,
  never hard-coded in source
- **Base UI system**: Tailwind design tokens (brand color scale, type, radius) + a
  first reusable component (`Button`) using `class-variance-authority`
- **Security headers** set in `next.config.js`
- **Health check** at `/api/health` (verifies DB connectivity — useful for deploy
  platform health probes)

## Running it locally

### 1. Prerequisites
- Node.js 20+
- A PostgreSQL database (local via Docker, or a free tier like Neon/Supabase)
- A Redis instance (local via Docker, or a free tier like Upstash)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Fill in `DATABASE_URL`, `REDIS_URL`, and generate a `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```
Set `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_USERNAME`, and `ADMIN_BOOTSTRAP_PASSWORD`
to real values before seeding (change the password immediately after first login in
any real deployment).

### 4. Set up the database
```bash
npm run prisma:migrate   # creates tables from schema.prisma
npm run prisma:seed      # creates roles, permissions, admin account, default commission
```

### 5. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:3000` — you should see the "Foundation is live" placeholder page.
Visit `http://localhost:3000/api/health` — should return `{"data":{"status":"ok"}}`.

### 6. Typecheck
```bash
npm run typecheck
```

## What to verify before moving to Phase 3

- [ ] `npm run prisma:migrate` succeeds against your Postgres instance
- [ ] `npm run prisma:seed` creates the admin user (check with `npx prisma studio`)
- [ ] `/api/health` returns 200
- [ ] Sign-in works via NextAuth once a customer/seller test account is created
      (registration UI itself is Phase 3 — for now, create a test user directly
      via `npx prisma studio` or a small script using `hashPassword`)

## Known gaps at this stage (intentional — deferred to later phases)

- No registration/login UI pages yet (auth *backend* is wired, forms are Phase 3)
- No product/cart/order UI (Phase 3)
- No seller or admin dashboards (Phases 4–5)
- No payment adapters implemented yet, only the `.env` shape reserved (Phase 6)
- No object storage adapter code yet (Phase 6, needed once product image upload is built)
- No automated tests yet (Phase 8, though `vitest` is already in devDependencies)

## Notes on what I could and couldn't verify here

I wrote and typed this code carefully against the Prisma/NextAuth/Next.js APIs I
know, but I have **not** run `npm install`, `prisma migrate`, or `next dev` against
a live database in this environment — I don't have a Postgres/Redis instance
available here to test against. Please run the steps above and tell me what
happens; if `npm run typecheck` or `prisma migrate` surface anything, paste the
error and I'll fix the root cause before we move on, per your rule #1 (never
pretend code works if it hasn't been verified).
