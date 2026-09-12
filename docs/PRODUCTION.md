# AJ Market — Production Readiness (Phase 16)

This document is the single reference for taking AJ Market from "runs on my
machine" to "safe to put in front of real users." Everything here was
verified against the actual code as of this phase, not written speculatively.

---

## 1. Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | No (default `development`) | Set to `production` on every deployed environment. Gates error-message masking in `errorHandler.ts` and Prisma log verbosity. |
| `PORT` | No (default `4000`) | Most PaaS providers (Railway, Render, Fly.io) inject their own `PORT` — usually fine to leave unset and let the platform control it. |
| `DATABASE_URL` | **Yes** | Full Postgres connection string. Use your managed provider's pooled connection string if available (see §2). |
| `JWT_ACCESS_SECRET` | **Yes** | Minimum 16 chars enforced by `env.ts`, but **use at least 32 random bytes in production** — generate with `openssl rand -hex 32`. Never reuse across environments. |
| `JWT_REFRESH_SECRET` | **Yes** | Same guidance as above. Must be a *different* value from `JWT_ACCESS_SECRET`. |
| `ACCESS_TOKEN_TTL` | No (default `15m`) | Keep short — this is a stateless token, it can't be revoked before it expires. |
| `REFRESH_TOKEN_TTL` | No (default `7d`) | This one *is* revocable (see `RefreshToken` table) — 7 days is a reasonable balance. |
| `CORS_ORIGIN` | **Yes in production** | Must be your real frontend's origin (e.g. `https://ajmarket.com`), not the `localhost:3000` default — the default would block your real frontend and, more importantly, leaving it permissive is a real security gap. |

### Web (`apps/web/.env.local`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | Baked into the client bundle at *build time* (see `apps/web/Dockerfile`) — must be the real API's public URL before you build, not set afterward. |

### Confirming secrets are never committed

Checked directly in `.gitignore` as of this phase: `.env`, `.env.local`, and `node_modules/`
are all excluded. `.env.example` files (committed intentionally) contain no real secrets —
only placeholder values and generation instructions. Verify this holds before every deploy:

```bash
git log --all --full-history -- '*.env'   # should return nothing
```

---

## 2. Database Migration Strategy

- **Schema is the single source of truth**: `apps/api/prisma/schema.prisma`. Every change
  goes through Prisma Migrate, never a manual `ALTER TABLE` against production.
- **Local development**: `npm run prisma:migrate` (`prisma migrate dev`) — creates a new
  migration file and applies it.
- **Production deploys**: use `prisma migrate deploy`, not `migrate dev` — it applies
  pending migrations without prompting or generating new ones, which is what you want in
  an automated deploy pipeline. Add this as a pre-start step in your deployment platform
  (Railway/Render both support a "pre-deploy command").
- **Rollback**: Prisma Migrate does not auto-generate down-migrations. For a genuinely
  bad migration, the safe path is: deploy a new forward migration that undoes the change,
  not a manual rollback against a live database. Keep migrations small and reversible in
  spirit (e.g., avoid destructive column drops in the same migration that also depends on
  the old column being gone — split into two deploys: stop using the column in application
  code first, drop it in a later migration once you're confident nothing depends on it).
- **Never run `prisma migrate reset` against production** — it drops the database.

---

## 3. Backup Strategy

This project doesn't manage its own backups — the database is expected to run on a managed
Postgres provider (Supabase, Neon, RDS, Railway's managed Postgres, etc.), and backup
strategy is largely a provider configuration choice, not application code:

- Enable your provider's **automated daily snapshots** with at least 7-day retention before
  launch — this is a checkbox in every major provider's dashboard, not optional.
- If your provider supports **point-in-time recovery** (PITR), enable it — daily snapshots
  alone mean losing up to 24 hours of orders/payments in the worst case.
- **Before any manual migration or bulk data operation**, take a manual snapshot first,
  even with automated backups running — cheap insurance against a mistake compounding
  before the next scheduled snapshot.
- Test a restore at least once before launch. An untested backup is a hypothesis, not a
  backup.

---

## 4. Logging

`apps/api/src/lib/logger.ts` (built in Phase 1) emits structured JSON to stdout/stderr —
this is the correct format for every major hosting platform to ingest into searchable logs
(Railway, Render, Fly.io, and any Docker-based host all capture container stdout
automatically). No additional logging infrastructure is required to get baseline
observability; just make sure your platform's log retention window is long enough to be
useful (a few days minimum).

---

## 5. Error Monitoring

`apps/api/src/lib/errorReporter.ts` (new this phase) is a small provider-abstraction — same
pattern as `payments/providers`, `notifications/channels`, and `delivery/providers`
elsewhere in this codebase. Right now it logs to stderr via the default
`ConsoleErrorReporter`; the file includes the exact code needed to swap in Sentry (or any
similar service) with no changes anywhere else. **Recommended before launch**: wire in a
real provider — unhandled errors currently only surface if someone is actively watching
logs, which doesn't scale past a few users.

Only genuinely unexpected errors are reported (`errorHandler.ts` filters `AppError`
instances — 404s, validation failures, permission denials — out before calling
`errorReporter.captureException`, since those are expected outcomes, not bugs).

---

## 6. Deployment Configuration

- **`apps/api/Dockerfile`** and **`apps/web/Dockerfile`** — multi-stage production builds
  (new this phase). Neither was build-tested in this sandbox (no Docker daemon available
  here — same class of environment limitation documented throughout this project); review
  them and run `docker build` yourself before relying on them, particularly the web
  Dockerfile's Next.js "standalone" output paths, which can shift slightly between Next.js
  versions in a monorepo.
- **`docker-compose.yml`** — spins up API + web + Postgres together for local testing of
  the built images before deploying anywhere.
- **`.github/workflows/ci.yml`** — typecheck, build, and unit-test both apps on every push
  and PR to `main`. Does not run the integration suite (would need a Postgres service
  container added to the workflow — straightforward to add once you have infrastructure to
  point it at).
- **Recommended hosting** (matches the stack choices in the original architecture
  blueprint): frontend → Vercel (zero-config for Next.js) or the provided Docker image;
  backend → Railway/Render/Fly.io via the provided Docker image; database → any managed
  Postgres provider.

---

## 7. Security Checklist

Consolidated from Phase 14's audit — re-verify each of these before going live, since code
can drift between when this was written and when you deploy:

- [ ] `CORS_ORIGIN` set to your real frontend origin, not the localhost default
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are strong (32+ random bytes), unique per
      environment, and never committed
- [ ] `NODE_ENV=production` set on every deployed environment (masks internal error
      messages — verified in `errorHandler.ts`)
- [ ] Refresh token cookie confirmed `httpOnly`, `secure`, `sameSite=lax`, scoped to
      `/api/v1/auth` (already true in code — `auth.cookies.ts`)
- [ ] Rate limiting active on auth (`auth.routes.ts`), review submission
      (`reviews.routes.ts`), and checkout (`orders.routes.ts`, added Phase 14)
- [ ] `adminRouter.use(authenticate, requireRole("ADMIN"))` still applied before every
      admin route (full-router gate, verified Phase 14 — re-check after any admin module
      changes)
- [ ] No hardcoded secrets anywhere in source (`git log --all -S "sk_live"` or similar
      spot-checks before every release)
- [ ] Error monitoring wired to a real provider (§5) — the console-only default is fine for
      development, not for production traffic
- [ ] Database backups enabled and a restore has been tested (§3)
- [ ] HTTPS enforced at the hosting platform / reverse proxy level (Vercel, Railway, and
      Render all do this by default — confirm rather than assume for any custom setup)

## 8. Performance Checklist

- [ ] `output: "standalone"` set in `next.config.js` (added this phase) — keeps the
      deployed frontend image minimal
- [ ] Database indexes reviewed for any new query patterns since Phase 14's audit
      (92 index/unique/id declarations existed as of that audit — re-count if the schema
      has grown significantly)
- [ ] Pagination `limit` caps enforced on every list endpoint (confirmed via zod
      `.max()` on the relevant query schemas as of Phase 14)
- [ ] Real image hosting (S3/R2/Cloudinary) connected and `next.config.js`'s
      `images.remotePatterns` updated — until then, `next/image` optimization is
      deliberately not used anywhere in the frontend (plain `<img>` throughout), documented
      since Phase 4
- [ ] Consider a caching layer (Redis) for hot read paths — category tree, homepage
      composition — if traffic reaches the point where repeated identical queries show up
      in slow-query logs. Not needed at current scale; flagged in the original architecture
      blueprint as explicit future work, not an oversight now.

---

## Summary

Nothing in this document was asserted without checking the actual code first — see the
inline references to specific files throughout. Items still genuinely open before a real
launch: wiring a real error-monitoring provider, actually build-testing both Dockerfiles
against a Docker daemon (not available in this build environment), and running the
integration test suite against a real database (same constraint).
