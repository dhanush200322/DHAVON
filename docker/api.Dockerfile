# ==============================================================================
# DHAVON API — Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Base image with corepack & pnpm
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Stage 2: Dependencies & Builder
FROM base AS builder
WORKDIR /app

# Copy root workspace manifests
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install dependencies deterministically
RUN pnpm install --frozen-lockfile

# Build workspace packages then API
RUN pnpm --filter @dhavon/types build
RUN pnpm --filter @dhavon/mcp build
RUN pnpm --filter @dhavon/api build

# Deploy isolated production package with flat, production-only node_modules
RUN pnpm --filter @dhavon/api --legacy deploy --prod /prod/api
RUN cp -r /app/apps/api/dist /prod/api/dist

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4000

# Security: create and run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy self-contained deployed API package
COPY --from=builder --chown=nestjs:nodejs /prod/api ./

USER nestjs

EXPOSE 4000

# Container liveness healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/health/live || exit 1

CMD ["node", "dist/main.js"]
