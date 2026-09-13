# AJ Market — Production Readiness

## Environment Variables

### API
| Variable | Required | Notes |
|---|---|---|
| NODE_ENV | No (default development) | Set to production on every deployed environment |
| DATABASE_URL | Yes | Full Postgres connection string; use pooled connection if available |
| JWT_ACCESS_SECRET | Yes | 32+ random bytes in production — `openssl rand -hex 32` |
| JWT_REFRESH_SECRET | Yes | Different value from JWT_ACCESS_SECRET |
| CORS_ORIGIN | Yes in production | Must be the real frontend origin, not localhost |

### Web
| Variable | Required | Notes |
|---|---|---|
| NEXT_PUBLIC_API_URL | Yes | Baked into the client bundle at BUILD time |

Secrets never committed: `.env`/`.env.local` excluded in .gitignore; verify with
`git log --all --full-history -- '*.env'` before every deploy.

## Database Migration Strategy
Schema is the single source of truth (schema.prisma). Local: `prisma migrate dev`.
Production: `prisma migrate deploy` — never `migrate dev` against production, never
`migrate reset` against production (drops the database).

## Backup Strategy
Managed by your Postgres provider — enable automated daily snapshots (7+ day retention)
and point-in-time recovery if available. Test a restore before launch.

## Logging & Error Monitoring
Structured JSON logs to stdout (lib/logger.ts) — captured automatically by any major
hosting platform. Error monitoring abstraction in lib/errorReporter.ts — console-based
today, with the exact code to swap in Sentry included as a comment. Only genuinely
unexpected errors are reported (AppError instances are filtered out — those are expected
outcomes, not bugs).

## Security Checklist
- [ ] CORS_ORIGIN set to real frontend origin
- [ ] JWT secrets are strong, unique per environment, never committed
- [ ] NODE_ENV=production on every deployed environment
- [ ] Refresh token cookie httpOnly/secure/sameSite=lax, scoped to /api/v1/auth
- [ ] Rate limiting active on auth, reviews, checkout
- [ ] Admin routes fully gated (`adminRouter.use(authenticate, requireRole("ADMIN"))`)
- [ ] Error monitoring wired to a real provider before real traffic
- [ ] Database backups enabled and a restore tested

## Performance Checklist
- [ ] next.config.js `output: "standalone"` set
- [ ] Pagination limits enforced on all list endpoints
- [ ] Real image hosting connected before enabling next/image optimization
- [ ] Consider Redis caching for hot read paths once traffic justifies it
