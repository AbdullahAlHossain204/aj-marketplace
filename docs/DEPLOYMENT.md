# AJ Market — Deployment Runbook (Phase 17)

**Read this first:** everything in this document is a precise, step-by-step guide for
*you* to execute — I don't have access to Vercel, Railway, or any hosting provider from
here, so none of these steps have been run against real infrastructure. Where a step could
plausibly go wrong in a way I can't predict without seeing it happen, I've said so rather
than asserting confidence I don't have. If something in here doesn't match what you
actually see in a provider's dashboard, that's expected — dashboards change; tell me what
you're seeing and I'll adjust the guidance.

This assumes Phase 16 (Dockerfiles, `docs/PRODUCTION.md`) is merged into your repo — the
Railway config in this phase builds from `apps/api/Dockerfile`.

---

## Order of operations

Deploy in this order — each step needs the previous one's output:

1. Database (get a connection string)
2. Backend (needs the database connection string)
3. Frontend (needs the backend's public URL)

---

## 1. Database — managed Postgres

Pick one (all have a free tier suitable for launch-scale traffic):

- **Neon** (neon.tech) — serverless Postgres, generous free tier, connection pooling built in
- **Supabase** (supabase.com) — Postgres + extras you're not using yet, fine to ignore the extras
- **Railway's own Postgres plugin** — simplest if you're already using Railway for the API (same dashboard, same billing)

Steps (Neon as the example — Supabase and Railway Postgres are functionally similar):

1. Create an account, create a new project/database.
2. Copy the connection string it gives you — it will look like
   `postgresql://user:password@host/dbname?sslmode=require`.
3. **Use the pooled/pgbouncer connection string if the provider offers one** — a serverless
   API on Railway/Render opens a new connection per request under load, and an
   unpooled connection string can exhaust Postgres's connection limit quickly.
4. Save this string — you'll set it as `DATABASE_URL` on the backend in step 2.

---

## 2. Backend — Railway (or Render/Fly.io as alternatives)

Using Railway as the primary path since `railway.json` (this phase) targets it directly.

1. Push your repo to GitHub if it isn't already (it is).
2. In Railway: **New Project → Deploy from GitHub repo** → select `aj-marketplace`.
3. Railway will detect `railway.json` at the repo root and build using
   `apps/api/Dockerfile` — **this is the first time that Dockerfile will actually be built**;
   it was written and reviewed in Phase 16 but never build-tested (no Docker daemon in the
   environment this project was built in). Watch the build logs. If it fails, the error will
   point at exactly which `COPY` or `RUN` step broke — send me that log and I'll fix the
   Dockerfile.
4. Once building, set these environment variables in Railway's dashboard (Variables tab):

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | the pooled connection string from step 1 |
   | `JWT_ACCESS_SECRET` | generate with `openssl rand -hex 32` (or use https://generate-secret.vercel.app/32 if you don't have a terminal yet) |
   | `JWT_REFRESH_SECRET` | a **different** generated value from the above |
   | `ACCESS_TOKEN_TTL` | `15m` |
   | `REFRESH_TOKEN_TTL` | `7d` |
   | `CORS_ORIGIN` | leave as `http://localhost:3000` for now — you'll update this in step 4 once you have the real frontend URL, or the browser will block every request from your deployed frontend |

5. Railway assigns a public URL automatically (something like
   `aj-marketplace-production.up.railway.app`) — find it under the service's Settings →
   Networking → Generate Domain if it isn't already there. **Copy this URL**, you need it
   for the frontend.
6. Run the database migration against your new production database. Railway lets you run
   a one-off command from its dashboard (Settings → the "Run Command" / shell feature,
   naming varies by Railway's current UI) — run:
   ```
   npx prisma migrate deploy
   ```
   This applies your schema to the real database. **Do not use `prisma migrate dev` here**
   — see `docs/PRODUCTION.md` §2 for why.
7. Verify the backend is actually up before moving on:
   ```
   curl https://<your-railway-url>/api/v1/health
   curl https://<your-railway-url>/api/v1/health/db
   ```
   The second one confirms the database connection specifically. Both should return
   `{"success":true,...}`. If `/health` works but `/health/db` doesn't, the app is running
   but can't reach Postgres — check `DATABASE_URL` and whether the database allows
   connections from Railway's IP range (most managed providers allow all by default, but
   some require explicitly allow-listing).

---

## 3. Frontend — Vercel

1. In Vercel: **Add New → Project** → import `aj-marketplace` from GitHub.
2. Vercel will ask for project settings before the first deploy — set:
   - **Root Directory**: `apps/web` — this is the standard, documented way Vercel handles
     an npm-workspaces monorepo like this one. It will still run `npm install` from the
     repo root automatically (Vercel detects the root `package-lock.json` and workspace
     config) — you don't need a custom install command.
   - **Framework Preset**: Next.js (should auto-detect once Root Directory is set)
3. Set the environment variable before the first build, not after — it gets baked into the
   client bundle at build time:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the Railway URL from step 2.5, e.g. `https://aj-marketplace-production.up.railway.app` |

4. Deploy. Vercel gives you a URL like `aj-marketplace.vercel.app` immediately, with HTTPS
   already on it automatically — nothing to configure there.
5. **Go back to Railway and update `CORS_ORIGIN`** to this real Vercel URL (step 2.4's
   placeholder). Without this, every API request from your live frontend will be blocked by
   CORS — this is the single most common thing to forget in this whole runbook.

---

## 4. Custom domain (optional)

- **Vercel**: Project Settings → Domains → add your domain, follow its DNS instructions
  (usually a CNAME or A record). HTTPS is automatic once DNS propagates.
- **Railway**: Settings → Networking → Custom Domain, similar DNS-record flow.
- If you add a custom domain for the frontend, **update `CORS_ORIGIN` again** on Railway to
  match the new domain (e.g. `https://ajmarket.com` instead of the `.vercel.app` one).

---

## 5. Post-deploy verification checklist

Go through this in order, on the real deployed URLs — this is the actual point of Phase 17,
not just "it built successfully."

- [ ] Homepage loads and shows categories/products (confirms frontend ↔ backend connectivity end to end)
- [ ] Register a new customer account
- [ ] Log out, log back in
- [ ] Browse products, use search and filters
- [ ] Add an item to cart, verify the price shown matches what's on the product page
- [ ] Complete checkout with Cash on Delivery
- [ ] View the order in order history, confirm the timeline shows a PENDING entry
- [ ] Register a vendor account, create a store, add a product as DRAFT
- [ ] (Manually flip that vendor's `VendorProfile.status` to `APPROVED` in the database via
      your provider's SQL console, since the admin approval UI needs an admin account —
      see next step)
- [ ] Publish the vendor's product to ACTIVE, confirm it appears in the public catalog
- [ ] Manually create an admin user (there's no self-registration path for ADMIN by design
      — see `auth.schemas.ts`) directly via your database provider's SQL console:
      insert a `User` row with `role = 'ADMIN'` and a real argon2 password hash (generating
      one requires running the app's own `argon2.hash()` — do this from your local machine
      once you have a terminal, not by hand)
- [ ] Log in as that admin, confirm the admin dashboard loads and shows the platform overview
- [ ] As the admin, approve the vendor properly through the UI (the manual DB flip above was
      just to unblock testing the publish flow before an admin existed — after this, use the
      real approval flow going forward)

If any of these fail, that's genuinely useful information — tell me exactly which step and
what you saw (error message, blank page, wrong data), and I'll help diagnose it against the
actual code rather than guessing.

---

## What this phase does not cover

- **CI/CD auto-deploy on push** — both Vercel and Railway support automatically redeploying
  on every push to `main` out of the box once connected to the GitHub repo; no extra config
  needed beyond what's in this runbook, but I haven't set up a staging/production branch
  split — that's a reasonable addition once you're deploying often enough for it to matter.
- **CDN/image hosting** — still not connected (documented as a known gap since Phase 4);
  product images are external URLs only until that's addressed.
- **Monitoring dashboards** beyond the error-reporting hook from Phase 16 — Railway and
  Vercel both have basic built-in metrics (request counts, response times) with no extra
  setup; anything beyond that is a future-phase concern.
