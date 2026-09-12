# syntax=docker/dockerfile:1

# ---- deps: install once, reused by both build and (if needed) dev stages ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace=apps/api

# ---- build: compile TypeScript and generate the Prisma client ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

# ---- runtime: the actual production image, nothing extra ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Never run as root in production.
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./package.json
USER nodejs
EXPOSE 4000
# Real secrets (JWT_ACCESS_SECRET, DATABASE_URL, etc.) are injected at
# deploy time by the hosting platform's env var mechanism — never baked
# into this image. See ../../docs/PRODUCTION.md for the full list.
CMD ["node", "dist/server.js"]
