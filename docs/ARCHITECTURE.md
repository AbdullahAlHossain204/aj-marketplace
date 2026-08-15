# AJ Marketplace — Phase 1: Architecture Proposal

This document proposes the technology stack and system architecture for AJ Marketplace, a multi-vendor e-commerce platform. Per the development approach requested, **no implementation code is included** — this is the architecture for review and approval before Phase 2 (Foundation) begins.

---

## A. Recommended Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict mode) | End-to-end type safety across frontend, API, and DB layer; catches contract mismatches (e.g. price/stock fields) at compile time. |
| Framework | Next.js (App Router) | SSR/SSG for SEO-critical pages (product, category, store pages), API routes co-located with the app, React Server Components reduce client JS, mature deployment story. |
| UI | React + Tailwind CSS + shadcn/ui (Radix primitives) | Accessible primitives out of the box (dialogs, dropdowns, forms), fast to theme into an original brand rather than looking like a template. |
| Database | PostgreSQL | Relational integrity for orders/payments/inventory, strong support for JSONB (product attributes), transactions, mature at scale. |
| ORM | Prisma | Type-safe queries matching TS end-to-end, migrations, good ergonomics for the relational schema this app needs. |
| Cache / Queues | Redis (cache) + a job queue (BullMQ on Redis) | Session/cart caching, rate limiting, and background jobs (image processing, notification dispatch, commission calculation) without blocking requests. |
| Search | Postgres full-text search initially → Meilisearch or OpenSearch when scale demands it | Avoid operating a search cluster on day one; Postgres FTS + trigram indexes cover MVP search/filter volume. Swap-in path is designed from the start (search is behind a service interface). |
| Auth | NextAuth.js (Auth.js) with credentials + session strategy, custom RBAC layer on top | Handles secure session/cookie mechanics, CSRF, and OAuth extensibility later, while custom role/permission tables give fine-grained control admin needs. |
| Object Storage | S3-compatible storage (AWS S3, or Cloudflare R2 / Backblaze B2 for lower cost) via a storage abstraction interface | Product images/videos live outside the DB; interface allows switching providers without touching business logic. |
| Payments | Provider-agnostic payment abstraction; initial adapters for Cash on Delivery + one gateway (e.g. Stripe or a local gateway such as SSLCommerz/bKash depending on target market) | Never lock business logic to one processor; webhook verification is provider-specific but isolated behind the adapter. |
| Deployment | Vercel (app) + managed Postgres (Neon/Supabase/RDS) + managed Redis (Upstash) | Minimal ops overhead for MVP, scales horizontally, preview deployments per PR. Migration path to containers (Docker on ECS/Fly.io) documented for when platform-specific limits are hit. |
| Background/Notifications | A single internal `NotificationService` abstraction, initial channel = in-app + email (Resend/SES) | SMS/push added later without touching call sites. |

**Why not a different stack (brief rationale):**
- A separate backend framework (NestJS/Express) was considered but rejected for MVP — Next.js API routes plus a clean `services/` layer give the same separation of concerns with one deployable unit and less operational overhead. If the team later needs independent scaling of the API from the storefront, the `services/` and `lib/db` layers are structured so an extraction to a standalone API service is mechanical, not a rewrite.
- MongoDB was considered but rejected — orders, payments, inventory, and commissions are inherently relational and need transactional integrity (no overselling, no double-charging), which Postgres handles natively.

---

## B. System Architecture

```
                         ┌─────────────────────┐
                         │        CDN           │
                         │ (static assets, IMG) │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │   Next.js App (SSR)   │
                         │  Storefront / Seller   │
                         │  Dashboard / Admin UI  │
                         └──────────┬───────────┘
                                    │  (internal service calls)
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐          ┌────────▼────────┐         ┌────────▼────────┐
│  Auth Service   │          │  Domain Services │         │ Payment Adapter │
│ (NextAuth+RBAC) │          │ (products, cart,  │         │   Layer          │
│                 │          │  orders, sellers,  │         │ (COD / Gateway)  │
│                 │          │  inventory, etc.)  │         │                  │
└───────┬───────┘          └────────┬────────┘         └────────┬────────┘
        │                           │                           │
        └───────────────┬───────────┴───────────────┬───────────┘
                         │                           │
                ┌────────▼────────┐         ┌────────▼────────┐
                │   PostgreSQL     │         │      Redis        │
                │ (source of truth)│         │ (cache/session/    │
                │                  │         │  rate-limit/queue) │
                └──────────────────┘         └────────────────────┘
                         │
                ┌────────▼────────┐
                │  Object Storage   │
                │ (product images,  │
                │  store logos)     │
                └────────────────────┘
```

**Key architectural principles:**
1. **Layered separation**: UI components never call the database directly — they call `services/`, which call `lib/db` (Prisma) or external adapters. This keeps business logic out of presentation code (per rule #12 in your spec).
2. **Provider abstraction**: Payments, storage, search, and notifications are each behind an interface so providers can be swapped without touching calling code.
3. **Server-side authority**: All price, stock, and permission checks happen server-side. The client never dictates a price or a role.
4. **Multi-tenancy at the data layer**: Sellers are scoped by `sellerId` on every relevant query; there is no reliance on the UI to hide other sellers' data.

---

## C. Database Design (Core ERD)

This is the MVP schema — not exhaustive of every future field, but structurally complete for the entities listed in your spec.

```
User (id, email, phone, passwordHash, role, status, createdAt, updatedAt)
  1—1 Seller (id, userId FK, storeId FK, applicationStatus, commissionOverride, createdAt)
  1—N Address (id, userId FK, label, line1, line2, city, region, postalCode, country, isDefault)
  1—1 Cart (id, userId FK)
  1—N Order (id, userId FK, ...)
  1—N Review (id, userId FK, productId FK, ...)
  1—N Wishlist (id, userId FK)
  1—N Notification (id, userId FK, type, payload, readAt)

Role (id, name)          — admin, seller, customer (+ future granular roles)
Permission (id, name)
RolePermission (roleId FK, permissionId FK)

Store (id, sellerId FK, name, slug, logoUrl, description, status, ratingAvg, createdAt)

Category (id, parentId FK nullable, name, slug, imageUrl)   — self-referencing for hierarchy
Brand (id, name, slug, logoUrl)

Product (id, storeId FK, categoryId FK, brandId FK, name, slug, description,
         shortDescription, sku, basePrice, discountPrice, status, ratingAvg,
         reviewCount, weight, dimensions JSONB, shippingInfo JSONB,
         warrantyInfo TEXT, createdAt, updatedAt)
  1—N ProductImage (id, productId FK, url, position, altText)
  1—N ProductVariant (id, productId FK, sku, price, stock, attributes JSONB, imageUrl)
  1—N ProductAttribute (id, productId FK, name, value)   — spec sheet entries

Inventory (id, variantId FK, quantity, reserved, lowStockThreshold, updatedAt)
InventoryHistory (id, variantId FK, change, reason, orderId FK nullable, createdAt)

CartItem (id, cartId FK, variantId FK, quantity, priceSnapshot)

Order (id, orderNumber, userId FK, subtotal, discountTotal, deliveryFee, total,
       paymentStatus, orderStatus, shippingAddressId FK, trackingNumber,
       createdAt, updatedAt)
  1—N SellerOrder (id, orderId FK, storeId FK, subtotal, commissionAmount,
                    sellerPayout, status, trackingNumber)
       1—N OrderItem (id, sellerOrderId FK, variantId FK, quantity,
                       priceAtPurchase, discountAtPurchase)

Payment (id, orderId FK, provider, providerRef, amount, status,
         webhookVerifiedAt, createdAt)

Shipment (id, sellerOrderId FK, carrier, trackingNumber, status, events JSONB)

Review (id, productId FK, userId FK, orderItemId FK, rating, title,
        comment, imageUrls[], verifiedPurchase, createdAt)

Coupon (id, code, scope[global|category|seller], discountType, discountValue,
        minSpend, usageLimit, expiresAt)

Commission (id, scope[global|category|seller], storeId FK nullable,
            categoryId FK nullable, percentage)
CommissionLedgerEntry (id, sellerOrderId FK, amount, type[earned|payout], createdAt)
Payout (id, sellerId FK, amount, status, processedAt)

Refund (id, sellerOrderId FK, amount, reason, status, processedAt)
Return  (id, orderItemId FK, reason, status, resolution)

SellerApplication (id, userId FK, storeName, nidNumber, nidDocumentUrl,
                    status, reviewedBy FK nullable, reviewedAt)

AuditLog (id, actorId FK, action, entityType, entityId, metadata JSONB, createdAt)
```

**Notable design decisions:**
- **`SellerOrder` as a first-class entity**: a customer `Order` fans out into one `SellerOrder` per store, each with its own status, tracking, commission, and payout — this directly implements the multi-vendor order-splitting logic from section 28 of your spec, without duplicating customer/shipping data.
- **`priceAtPurchase` / `priceSnapshot` fields**: prices are copied at time of cart/order creation so historical orders remain accurate even if a seller later changes a price.
- **`Inventory.reserved`**: supports atomic stock holds during checkout to prevent overselling under concurrent purchases (implemented via DB transactions, see section H).
- **Commission is resolved per `SellerOrder`** at order-creation time using a resolution order of seller-specific → category → global, then logged in `CommissionLedgerEntry` for auditability — nothing is hard-coded.
- Soft deletion (`deletedAt` timestamp) is added to `Product`, `Store`, and `User` rather than hard deletes, to preserve order history integrity.

---

## D. Project Folder Structure

```
aj-marketplace/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx                  # Homepage
│   │   ├── products/[slug]/page.tsx
│   │   ├── categories/[slug]/page.tsx
│   │   ├── stores/[slug]/page.tsx
│   │   ├── search/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   └── account/
│   │       ├── orders/page.tsx
│   │       ├── addresses/page.tsx
│   │       ├── wishlist/page.tsx
│   │       └── settings/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (seller)/
│   │   └── seller/
│   │       ├── dashboard/page.tsx
│   │       ├── products/page.tsx
│   │       ├── orders/page.tsx
│   │       ├── inventory/page.tsx
│   │       ├── analytics/page.tsx
│   │       └── settings/page.tsx
│   ├── (admin)/
│   │   └── admin/
│   │       ├── dashboard/page.tsx
│   │       ├── users/page.tsx
│   │       ├── sellers/page.tsx
│   │       ├── products/page.tsx
│   │       ├── orders/page.tsx
│   │       ├── categories/page.tsx
│   │       ├── commissions/page.tsx
│   │       └── audit-logs/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── products/route.ts
│       ├── cart/route.ts
│       ├── orders/route.ts
│       ├── payments/webhook/route.ts
│       ├── sellers/route.ts
│       └── admin/...
├── components/
│   ├── ui/                            # shadcn/ui primitives
│   ├── product/
│   ├── cart/
│   ├── seller/
│   └── admin/
├── services/                          # business logic, no UI, no HTTP concerns
│   ├── product.service.ts
│   ├── cart.service.ts
│   ├── order.service.ts
│   ├── inventory.service.ts
│   ├── commission.service.ts
│   ├── notification.service.ts
│   └── payment/
│       ├── payment-adapter.interface.ts
│       ├── cod.adapter.ts
│       └── gateway.adapter.ts
├── lib/
│   ├── db/                            # Prisma client, transactions
│   ├── auth/                          # session helpers, RBAC checks
│   ├── storage/                       # storage abstraction + S3 adapter
│   ├── validation/                    # zod schemas, shared client+server
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── types/
├── config/                            # env-driven configuration, not hard-coded
├── tests/
│   ├── unit/
│   └── integration/
└── public/
```

---

## E. Authentication Architecture

- **Session strategy**: NextAuth.js with database-backed sessions (not pure JWT) so admin can invalidate sessions (e.g. on seller suspension) instantly.
- **Credentials**: email/phone + password, hashed with bcrypt/argon2, never stored or logged in plain text.
- **RBAC**: `Role` and `Permission` tables (section C) rather than a hard-coded role string check everywhere — admin can eventually create custom roles without a code change. Every server action/API route re-derives the caller's permissions from the DB session; nothing sensitive is trusted from client state.
- **Special admin account**: rather than a hard-coded username/password in source (which your own rule #5 prohibits), the initial admin account is created via a seeded, environment-variable-driven bootstrap script at deploy time — the credentials you specified can be used as the *seed values* supplied through environment variables, not committed to the repo.
- **Verification**: email/phone verification tokens, time-limited, single-use.
- **Rate limiting**: login and password-reset endpoints are rate-limited via Redis to prevent brute force.

---

## F. API Architecture

- REST-style API routes grouped by domain (`/api/products`, `/api/cart`, `/api/orders`, `/api/sellers`, `/api/admin/*`), each backed by a `services/` module — no business logic inside route handlers beyond request parsing, auth check, and response shaping.
- **Validation**: Zod schemas shared between client forms and server routes, so validation rules are defined once.
- **Consistent envelope**: `{ data, error, meta }` response shape; consistent HTTP status codes (400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict e.g. stock, 422 business-rule violation, 500 server error).
- **Pagination**: cursor or offset-based pagination standardized across list endpoints (`?page=&limit=`).
- **Authorization middleware**: every `/api/seller/*` route checks the caller owns the `storeId` being acted on; every `/api/admin/*` route checks the `admin` role server-side.

---

## G. Payment Architecture

- `PaymentAdapter` interface defines `initiate()`, `verifyWebhook()`, `getStatus()`, `refund()`. Concrete adapters (`CODAdapter`, `GatewayAdapter`) implement it; `order.service.ts` never talks to a provider SDK directly.
- Payment credentials (API keys, webhook secrets) are read from environment variables only, never committed, never sent to the client.
- Webhooks are verified using the provider's signature-verification method before any order/payment state changes.
- Payment states (`Pending`, `Processing`, `Paid`, `Failed`, `Refunded`) live on the `Payment` and `Order` records and are only transitioned by server-side logic in response to a verified event, never a client call.

---

## H. Seller / Order Architecture

- **Checkout flow**: cart items are grouped by `storeId` server-side at checkout time → one parent `Order` + one `SellerOrder` per store → `OrderItem`s under each `SellerOrder`.
- **Stock reservation**: within a single DB transaction, checkout (a) re-validates current price and stock for every line item server-side (ignoring any client-supplied price), (b) increments `Inventory.reserved`, and (c) creates the order — if any item fails validation, the whole transaction rolls back. This prevents overselling under concurrent checkouts.
- **Seller visibility**: sellers query `SellerOrder`/`OrderItem` scoped to their own `storeId` only; customers see the full parent `Order` with all `SellerOrder`s nested.
- **Commission**: calculated per `SellerOrder` at creation time (seller-specific override → category rate → global default), written to `CommissionLedgerEntry`, and used to compute seller payouts — fully configurable by admin, never hard-coded.

---

## I. Deployment Architecture

- **App**: Vercel (or equivalent Next.js-optimized host) for the storefront/dashboards — automatic scaling, edge caching for static/ISR pages, preview environments per branch.
- **Database**: managed Postgres (Neon, Supabase, or RDS) with automated backups and read replicas added when read load grows.
- **Cache/Queue**: managed Redis (Upstash or ElastiCache).
- **Object storage**: S3 or R2 bucket with a CDN in front for product images.
- **Environments**: `development`, `staging`, `production`, each with isolated databases and environment variable sets — no shared secrets across environments.
- **CI/CD**: run typecheck, lint, unit tests, and migration checks on every PR before merge; migrations applied via a controlled deploy step, not automatically on app boot.
- **Migration path**: if/when the platform needs independent scaling of API vs. storefront, the `services/` layer can be lifted into a standalone Node service behind the same interfaces, deployed on containers (Fly.io/ECS) — this is a structural option built in from day one, not a requirement for MVP.

---

## J. MVP vs. Future Features

**MVP (Phases 2–6 as scoped in your roadmap):**
Auth & roles, categories, product catalog with variants, search/filter/sort, cart, checkout with COD + one payment gateway, multi-seller order splitting, seller dashboard (products/orders/inventory/basic analytics), admin dashboard (user/seller/product/order/category/commission management), reviews, basic notifications (in-app + email), commission system, audit logs.

**Deferred (architected for, not built yet):** flash sales, coupons/vouchers, product bundles, affiliate system, loyalty points, wallet, gift cards, live/seller chat, AI recommendations, product comparison, advanced analytics, delivery-partner integrations, multi-warehouse, multi-language, multi-currency, native mobile apps.

Each deferred feature has a natural extension point already reserved in the schema/services above (e.g. `Coupon` table exists structurally; the discount-application logic is not yet wired into checkout).

---

## K. Development Roadmap

1. **Phase 2 — Foundation**: repo setup, Prisma schema + migrations, NextAuth + RBAC, base UI system (design tokens, shadcn setup), environment config, health-check API.
2. **Phase 3 — Customer Marketplace**: homepage, categories, PLP/PDP, search/filter, cart, checkout, order history/tracking.
3. **Phase 4 — Seller System**: seller application + approval flow, store creation, product CRUD + variants, inventory, seller order views, basic analytics.
4. **Phase 5 — Admin System**: admin dashboard, user/seller/product/category/order management, commission configuration, moderation queues, audit logs.
5. **Phase 6 — Payments & Shipping**: payment adapters, webhook verification, shipment/tracking model.
6. **Phase 7 — Security & Performance audit**, **Phase 8 — Testing**, as you scoped.

---

This is the architecture proposal. Per your instructions, I'm stopping here for your review and approval before any implementation (Phase 2) begins. Let me know if you'd like changes to the stack, schema, or roadmap — or if this looks good, I'll start Phase 2 with the project setup, Prisma schema, and auth system.
