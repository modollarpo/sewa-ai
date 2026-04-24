# SEWA AI — backend/Dockerfile
# Multi-stage build: compile TypeScript → lean production image
# © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

# ── Stage 1: Install ALL deps + build ─────────────────────────
FROM node:20 AS builder
ARG CACHE_BUST=1
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy manifests first (layer cache)
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL deps (skip broken lifecycle scripts, audit, and fund checks for CI speed/stability)
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Generate Prisma client before compiling
RUN ./node_modules/.bin/prisma generate --schema ./prisma/schema.prisma 2>&1 | tr -cd '\11\12\15\40-\176'

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Prune devDeps for production image
RUN npm prune --production

# ── Stage 2: Lean production image ────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd -r sewa && useradd -r -g sewa sewa

# Copy only what runtime needs
COPY --from=builder --chown=sewa:sewa /app/dist         ./dist
COPY --from=builder --chown=sewa:sewa /app/node_modules ./node_modules
COPY --from=builder --chown=sewa:sewa /app/prisma       ./prisma
COPY --from=builder --chown=sewa:sewa /app/package.json ./
COPY --from=builder --chown=sewa:sewa /app/tsconfig.json ./

USER sewa
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
