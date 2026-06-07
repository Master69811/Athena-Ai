# ──────────────────────────────────────────────────────────────
# Athena AI — API (NestJS + Prisma) production image
# Build context = repository root (pnpm + TurboRepo monorepo).
# Works on Railway, Render, Fly.io, or any Docker host.
# The web frontend is deployed separately (Vercel) — not built here.
# ──────────────────────────────────────────────────────────────

# ---------- build stage ----------
FROM node:20-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy the whole workspace (node_modules/build artifacts excluded via .dockerignore)
COPY . .

# Install only the API workspace and its deps, then generate Prisma client + build
RUN pnpm install --frozen-lockfile --filter @athena/api...
RUN pnpm --filter @athena/api exec prisma generate
RUN pnpm --filter @athena/api build

# ---------- runtime stage ----------
FROM node:20-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
ENV NODE_ENV=production
WORKDIR /app

# Bring over the built workspace (incl. resolved node_modules + Prisma client)
COPY --from=build /app ./

WORKDIR /app/apps/api
EXPOSE 3001

# On boot: apply migrations, seed (idempotent upserts; non-fatal if it fails), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && (npx ts-node prisma/seed.ts || echo 'seed skipped') && node dist/src/main"]
